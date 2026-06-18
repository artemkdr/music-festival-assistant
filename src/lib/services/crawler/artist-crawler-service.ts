/**
 * Artist crawler service: fetches artist data from Spotify and enriches with AI if needed.
 */
import type { ILogger } from '@/lib/types/logger';
import { IMusicalAIService } from '@/lib/services/ai/interfaces';
import { IArtistCrawlerService } from '@/lib/services/crawler/interfaces';
import { SpotifyService, SpotifyArtist } from '@/lib/services/spotify/spotify-service';
import { type Artist } from '@/lib/schemas';
import { IWebSearchService, WebSearchError } from '@/lib/services/web-search';

export class ArtistCrawlerService implements IArtistCrawlerService {
    constructor(
        private readonly logger: ILogger,
        private readonly spotifyApi: SpotifyService,
        private readonly aiService: IMusicalAIService,
        private readonly webSearchService: IWebSearchService
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
            webSearch?: {
                country?: string | undefined;
                searchLang?: string | undefined;
                count?: number | undefined;
            };
        }
    ): Promise<Artist> {
        let spotifyArtist: SpotifyArtist | null = null;
        try {
            spotifyArtist = data?.spotifyId ? await this.spotifyApi.getArtistById(data.spotifyId) : await this.spotifyApi.searchArtistByName(name);
        } catch (err) {
            this.logger.error('Spotify search failed', err instanceof Error ? err : new Error(String(err)));
        }

        const searchQuery = this.buildSearchQuery(spotifyArtist?.name || name, data?.context);
        let webSearchResults: Awaited<ReturnType<IWebSearchService['search']>>;
        try {
            webSearchResults = await this.webSearchService.search({
                query: searchQuery,
                country: data?.webSearch?.country,
                searchLang: data?.webSearch?.searchLang,
                count: data?.webSearch?.count,
            });
        } catch (err) {
            const error = err instanceof WebSearchError ? err : new WebSearchError(`Web search failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'search_failed');
            this.logger.error('Web search failed for artist enrichment', error);
            throw error;
        }

        if (!webSearchResults.results.length) {
            throw new WebSearchError('Web search returned no grounding data for artist enrichment', 'empty_grounding');
        }

        try {
            const enrichedResult = await this.aiService.generateArtist([
                `Name: ${spotifyArtist?.name || name}`,
                `Spotify id: ${spotifyArtist?.id || ''}`,
                `Spotify genres: ${JSON.stringify(spotifyArtist?.genres || [])}`,
                `Web search grounding results: ${JSON.stringify(webSearchResults.results)}`,
                ...(data?.context ? [`Context: ${data.context}`] : []),
            ]);
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
            enrichedResult.genre = Array.from(new Set([...(spotifyArtist?.genres || []).map(g => g.toLowerCase()), ...(enrichedResult.genre || []).map(g => g.toLowerCase())]));
            return enrichedResult;
        } catch (err) {
            this.logger.error('AI service failed to enrich artist data', err instanceof Error ? err : new Error(String(err)));
            throw new Error(`Failed to enrich artist data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    private buildSearchQuery(name: string, context?: string): string {
        const normalizedContext = context?.trim();
        if (!normalizedContext) {
            return `${name} artist biography live performance`;
        }
        return `${name} artist biography live performance ${normalizedContext}`.slice(0, 400);
    }
}
