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

        let streamingLinks: Record<string, string | undefined> = {
            spotify: spotifyArtist?.spotifyUrl || '',
        };
        let socialLinks: Record<string, string | undefined> = {};
        let description = '';
        const popularity: Record<string, number> = {
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
            const artistShortSchema = artistSchema.pick({
                name: true,
                genre: true,
                socialLinks: true,
                streamingLinks: true,
                description: true,
            });
            const aiResult = await this.aiService.extractStructuredData<Artist>({
                prompt: `Provide the following short information about music artist named ${spotifyArtist.name}, spotify ID: ${spotifyArtist.id}: decscription, genre, social links, streaming links.`,
                schema: artistShortSchema, // TODO: Use a Zod schema for description
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
