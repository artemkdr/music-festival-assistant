import type { Artist } from '@/lib/schemas';
import { IMusicalAIService } from '@/lib/services/ai/interfaces';
import { ArtistCrawlerService } from '@/lib/services/crawler/artist-crawler-service';
import type { SpotifyService } from '@/lib/services/spotify/spotify-service';
import { IWebSearchService, WebSearchError } from '@/lib/services/web-search';
import type { ILogger } from '@/lib/types/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
};

describe('ArtistCrawlerService', () => {
    const spotifyApi = {
        getArtistById: vi.fn(),
        searchArtistByName: vi.fn(),
    } as unknown as SpotifyService;
    const aiService = {
        generateArtist: vi.fn(),
    } as unknown as IMusicalAIService;
    const webSearchService = {
        search: vi.fn(),
    } as unknown as IWebSearchService;

    let service: ArtistCrawlerService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ArtistCrawlerService(logger, spotifyApi, aiService, webSearchService);
    });

    it('uses web grounding and merges spotify data', async () => {
        vi.mocked(spotifyApi.searchArtistByName).mockResolvedValue({
            id: 'spotify-1',
            name: 'Test Artist',
            genres: ['Indie Rock'],
            popularity: 77,
            followers: 1000,
            spotifyUrl: 'https://open.spotify.com/artist/spotify-1',
            imageUrl: 'https://img.example.com/artist.jpg',
        });
        vi.mocked(webSearchService.search).mockResolvedValue({
            query: 'Test Artist',
            extractedAt: new Date().toISOString(),
            results: [
                {
                    url: 'https://artist.example.com',
                    title: 'Artist',
                    snippets: ['Known for energetic live performances'],
                    sourceType: 'generic',
                    rank: 1,
                },
            ],
        });

        const aiArtist: Artist = {
            id: 'artist-1',
            name: 'Test Artist',
            genre: ['alternative'],
            description: 'Great live act',
            sources: ['https://artist.example.com'],
        };
        vi.mocked(aiService.generateArtist).mockResolvedValue(aiArtist);

        const result = await service.crawlArtistByName('Test Artist', { context: 'Festival in Berlin' });

        expect(webSearchService.search).toHaveBeenCalledTimes(1);
        expect(aiService.generateArtist).toHaveBeenCalledTimes(1);
        expect(result.mappingIds?.spotify).toBe('spotify-1');
        expect(result.streamingLinks?.spotify).toBe('https://open.spotify.com/artist/spotify-1');
        expect(result.imageUrl).toBe('https://img.example.com/artist.jpg');
        expect(result.genre).toEqual(['indie rock', 'alternative']);
    });

    it('fails closed when web search errors and skips AI enrichment', async () => {
        vi.mocked(spotifyApi.searchArtistByName).mockResolvedValue(null);
        vi.mocked(webSearchService.search).mockRejectedValue(new WebSearchError('Rate limited', 'rate_limited', 429, true));

        await expect(service.crawlArtistByName('Test Artist')).rejects.toMatchObject({
            name: 'WebSearchError',
            code: 'rate_limited',
        });
        expect(aiService.generateArtist).not.toHaveBeenCalled();
    });

    it('fails closed when web search returns empty results and skips AI enrichment', async () => {
        vi.mocked(spotifyApi.searchArtistByName).mockResolvedValue(null);
        vi.mocked(webSearchService.search).mockResolvedValue({
            query: 'Test Artist',
            extractedAt: new Date().toISOString(),
            results: [],
        });

        await expect(service.crawlArtistByName('Test Artist')).rejects.toMatchObject({
            name: 'WebSearchError',
            code: 'empty_grounding',
        });
        expect(aiService.generateArtist).not.toHaveBeenCalled();
    });
});
