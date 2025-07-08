/**
 * Unit tests for SpotifyService
 * Covers token refresh, artist search, and error handling
 */
import { SpotifyService, type SpotifyArtist } from '@/lib/services/spotify/spotify-service';
import type { ILogger } from '@/lib/types/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---
const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
};

const clientId = 'test-client-id';
const clientSecret = 'test-client-secret';

const mockAccessToken = 'mock-access-token';
const mockArtistResponse = {
    id: 'artist123',
    name: 'Test Artist',
    genres: ['rock'],
    popularity: 80,
    followers: { total: 10000 },
    images: [{ url: 'http://image.url' }],
    external_urls: { spotify: 'http://spotify.com/artist/artist123' },
};
const mockSpotifyArtist: SpotifyArtist = {
    id: 'artist123',
    name: 'Test Artist',
    genres: ['rock'],
    popularity: 80,
    followers: 10000,
    imageUrl: 'http://image.url',
    spotifyUrl: 'http://spotify.com/artist/artist123',
};

const mockSearchResponse = {
    artists: {
        items: [mockArtistResponse],
    },
};

describe('SpotifyService', () => {
    let service: SpotifyService;
    let fetchSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        fetchSpy = vi.fn();
        // Override global fetch
        (global as unknown as { fetch: typeof fetch }).fetch = fetchSpy;
        service = new SpotifyService(logger, clientId, clientSecret);
    });

    afterEach(() => {
        delete (global as unknown as { fetch?: typeof fetch }).fetch;
    });

    it('refreshes access token and caches it', async () => {
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: vi.fn().mockResolvedValue({ access_token: mockAccessToken, expires_in: 3600 }),
                text: vi.fn().mockResolvedValue(''),
            } as unknown as Response)
        );
        const token = await (service as unknown as { refreshAccessToken: () => Promise<string> }).refreshAccessToken();
        expect(token).toBe(mockAccessToken);
        expect(service['accessToken']).toBe(mockAccessToken);
        expect(service['tokenExpiresAt']).toBeGreaterThan(Date.now());
        expect(logger.info).toHaveBeenCalledWith('Spotify access token refreshed', { expiresIn: 3600 });
    });

    it('gets artist by ID', async () => {
        // Mock token fetch
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: vi.fn().mockResolvedValue({ access_token: mockAccessToken, expires_in: 3600 }),
                text: vi.fn().mockResolvedValue(''),
            } as unknown as Response)
        );
        // Mock artist fetch
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: vi.fn().mockResolvedValue(mockArtistResponse),
                text: vi.fn().mockResolvedValue(''),
            } as unknown as Response)
        );
        const artist = await service.getArtistById('artist123');
        expect(artist).toEqual(mockSpotifyArtist);
    });

    it('searches artists by name', async () => {
        // Mock token fetch
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: vi.fn().mockResolvedValue({ access_token: mockAccessToken, expires_in: 3600 }),
                text: vi.fn().mockResolvedValue(''),
            } as unknown as Response)
        );
        // Mock search fetch
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: vi.fn().mockResolvedValue(mockSearchResponse),
                text: vi.fn().mockResolvedValue(''),
            } as unknown as Response)
        );
        const artists = await service.searchArtistsByName('Test Artist');
        expect(artists).toHaveLength(1);
        expect(artists[0]).toEqual(mockSpotifyArtist);
    });

    it('searches single artist by name', async () => {
        // Mock token fetch
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: vi.fn().mockResolvedValue({ access_token: mockAccessToken, expires_in: 3600 }),
                text: vi.fn().mockResolvedValue(''),
            } as unknown as Response)
        );
        // Mock search fetch
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: vi.fn().mockResolvedValue(mockSearchResponse),
                text: vi.fn().mockResolvedValue(''),
            } as unknown as Response)
        );
        const artist = await service.searchArtistByName('Test Artist');
        expect(artist).toEqual(mockSpotifyArtist);
    });

    it('returns null if artist not found by name', async () => {
        // Mock token fetch
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: vi.fn().mockResolvedValue({ access_token: mockAccessToken, expires_in: 3600 }),
                text: vi.fn().mockResolvedValue(''),
            } as unknown as Response)
        );
        // Mock search fetch (no results)
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: vi.fn().mockResolvedValue({ artists: { items: [] } }),
                text: vi.fn().mockResolvedValue(''),
            } as unknown as Response)
        );
        const artist = await service.searchArtistByName('Unknown Artist');
        expect(artist).toBeNull();
    });

    it('throws on token fetch error', async () => {
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: vi.fn().mockResolvedValue({ error: 'invalid_client' }),
                text: vi.fn().mockResolvedValue('invalid_client'),
            } as unknown as Response)
        );
        await expect((service as unknown as { refreshAccessToken: () => Promise<string> }).refreshAccessToken()).rejects.toThrow('Spotify API error: 401 Unauthorized - invalid_client');
    });

    it('throws on artist fetch error', async () => {
        // Mock token fetch
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: vi.fn().mockResolvedValue({ access_token: mockAccessToken, expires_in: 3600 }),
                text: vi.fn().mockResolvedValue(''),
            } as unknown as Response)
        );
        // Mock artist fetch error
        fetchSpy.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: vi.fn().mockResolvedValue({ error: 'not_found' }),
                text: vi.fn().mockResolvedValue('not_found'),
            } as unknown as Response)
        );
        await expect(service.getArtistById('bad-id')).rejects.toThrow('Spotify API error: 404 Not Found - not_found');
    });
});
