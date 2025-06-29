/**
 * Artist crawler service: fetches artist data from Spotify and enriches with AI if needed.
 */
import type { ILogger } from '@/lib/types/logger';
import { IMusicalAIService } from '@/lib/services/ai/interfaces';
import { IArtistCrawlerService } from '@/lib/services/crawler/interfaces';
import { SpotifyService, SpotifyArtist } from '@/lib/services/spotify/spotify-service';
import { type Artist } from '@/lib/schemas';

export class ArtistCrawlerService implements IArtistCrawlerService {
    constructor(
        private readonly logger: ILogger,
        private readonly spotifyApi: SpotifyService,
        private readonly aiService: IMusicalAIService
    ) {}

    /**
     * Crawl artist data by name: try Spotify first, then enrich with AI if needed.
     * @param name Artist name (assumed unique for this context)
     * @returns Complete Artist object
     */
    async crawlArtistByName(
        name: string,
        data?: {
            spotifyId?: string | undefined;
            context?: string | undefined;
            url?: string | undefined; // Optional URL for additional context
        }
    ): Promise<Artist> {
        let spotifyArtist: SpotifyArtist | null = null;
        try {
            spotifyArtist = data?.spotifyId ? await this.spotifyApi.getArtistById(data.spotifyId) : await this.spotifyApi.searchArtistByName(name);
        } catch (err) {
            this.logger.error('Spotify search failed', err instanceof Error ? err : new Error(String(err)));
        }

        try {
            const enrichedResult = await this.aiService.generateArtist([
                `Name: ${spotifyArtist?.name || name}`,
                `Spotify id: ${spotifyArtist?.id || ''}`,
                ...(data?.context ? [`Context: ${data?.context}`] : []),
            ]);
            // take in priority the Spotify data if available
            if (spotifyArtist) {
                enrichedResult.name = spotifyArtist.name;
                enrichedResult.mappingIds = {
                    ...enrichedResult.mappingIds,
                    ...{ spotify: spotifyArtist.id },
                };
                enrichedResult.streamingLinks = {
                    ...enrichedResult.streamingLinks,
                    ...{ spotify: spotifyArtist.spotifyUrl },
                };
                enrichedResult.popularity = {
                    ...enrichedResult.popularity,
                    spotify: {
                        ...enrichedResult.popularity?.spotify,
                        rating: spotifyArtist.popularity,
                    },
                };
                enrichedResult.imageUrl = spotifyArtist.imageUrl || enrichedResult.imageUrl;
            }
            // lowercase all the genres and take unique values from both sources
            enrichedResult.genre = Array.from(new Set([...(spotifyArtist?.genres || []).map(g => g.toLowerCase()), ...(enrichedResult.genre || []).map(g => g.toLowerCase())]));
            return enrichedResult;
        } catch (err) {
            this.logger.error('AI service failed to enrich artist data', err instanceof Error ? err : new Error(String(err)));
            throw new Error(`Failed to enrich artist data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }
}
