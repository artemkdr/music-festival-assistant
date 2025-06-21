/**
 * Artist crawler service: fetches artist data from Spotify and enriches with AI if needed.
 */
import type { ILogger } from '@/lib/logger';
import type { IAIService } from '@/services/ai';
import { generateArtistId, type Artist } from '@/types';
import { SpotifyApiService, SpotifyArtist } from '@/services/spotify/spotify-api-service';
import { artistSchema } from '@/schemas';

export class ArtistCrawlerService {
    constructor(
        private readonly logger: ILogger,
        private readonly spotifyApi: SpotifyApiService,
        private readonly aiService: IAIService
    ) {}

    /**
     * Crawl artist data by name: try Spotify first, then enrich with AI if needed.
     * @param name Artist name (assumed unique for this context)
     * @returns Complete Artist object
     */
    async crawlArtistByName(name: string): Promise<Artist> {
        const id = generateArtistId();
        // 1. Try Spotify
        let spotifyArtist: SpotifyArtist | null = null;
        try {
            spotifyArtist = await this.spotifyApi.searchArtistByName(name);
        } catch (err) {
            this.logger.error('Spotify search failed', err instanceof Error ? err : new Error(String(err)));
        }

        let streamingLinks: Record<string, string | undefined> = {};
        let socialLinks: Record<string, string | undefined> = {};
        let description = '';
        let popularity: Record<string, number> = {
            spotify: spotifyArtist?.popularity || 0,
        };

        if (!spotifyArtist) {
            this.logger.warn(`Artist not found on Spotify: ${name}`);
            spotifyArtist = {
                name,
                id,
                genres: [],
                imageUrl: '',
                popularity: 0,
                followers: 0,
                spotifyUrl: '',
            };
        }

        // 2. Use AI to enrich description
        try {
            const aiResult = await this.aiService.extractStructuredData<Artist>({
                prompt: `Provide a concise, informative description for the music artist named ${spotifyArtist.name}, spotify ID: ${spotifyArtist.id}`,
                schema: artistSchema, // TODO: Use a Zod schema for description
                maxTokens: 5000,
            });
            // merge disctint genres
            spotifyArtist.genres = Array.from(new Set([...(spotifyArtist.genres || []), ...(aiResult.genre || [])]));
            // merge streaming links
            streamingLinks = {
                spotify: spotifyArtist.spotifyUrl,
                ...aiResult.streamingLinks,
            };
            // merge social links
            socialLinks = {
                ...aiResult.socialLinks,
            };
            // description
            description = aiResult.description || '';
            // merge popularity
            popularity = {
                spotify: spotifyArtist.popularity || 0,
                ai: aiResult.popularity?.ai || 0,
                appleMusic: aiResult.popularity?.appleMusic || 0,
                youtube: aiResult.popularity?.youtube || 0,
                soundcloud: aiResult.popularity?.soundcloud || 0,
                bandcamp: aiResult.popularity?.bandcamp || 0,
            };
        } catch (err) {
            this.logger.warn('AI enrichment for artist description failed', err instanceof Error ? err : new Error(String(err)));
        }
        return {
            id,
            mappingIds: { spotify: spotifyArtist.id },
            description,
            name: spotifyArtist.name,
            genre: spotifyArtist.genres,
            imageUrl: spotifyArtist.imageUrl,
            popularity,
            streamingLinks,
            socialLinks,
        };
    }
}
