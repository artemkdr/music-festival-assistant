/**
 * Unit tests for ArtistService
 * Tests artist CRUD, search, and enrichment features
 */
import type { IArtistRepository } from '@/lib/repositories/interfaces';
import type { Artist } from '@/lib/schemas';
import { ArtistService } from '@/lib/services/artist-service';
import type { IArtistCrawlerService } from '@/lib/services/crawler/interfaces';
import type { CreateArtistData } from '@/lib/services/interfaces';
import type { ILogger } from '@/lib/types/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockArtists } from '../mock-data';

// Mock dependencies
const mockLogger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
};

const mockArtistRepository: IArtistRepository = {
    getArtistById: vi.fn(),
    getArtistsByIds: vi.fn(),
    searchArtistByName: vi.fn(),
    searchArtistsByName: vi.fn(),
    saveArtist: vi.fn(),
    deleteArtist: vi.fn(),
    getAllArtists: vi.fn(),
    getArtistsByGenres: vi.fn(),
};

const mockArtistCrawlerService: IArtistCrawlerService = {
    crawlArtistByName: vi.fn(),
};

describe('ArtistService', () => {
    let service: ArtistService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ArtistService(mockArtistRepository, mockArtistCrawlerService, mockLogger);
    });

    describe('getArtistById', () => {
        it('should fetch artist by ID', async () => {
            if (!mockArtists[0]) throw new Error('mockArtists[0] is undefined');
            // Ensure type compatibility by casting to Artist
            const artist: Artist = { ...mockArtists[0], id: mockArtists[0].id || 'artist-1', name: mockArtists[0].name || 'Arctic Monkeys' };
            vi.mocked(mockArtistRepository.getArtistById).mockResolvedValue(artist);
            const result = await service.getArtistById('artist-1');
            expect(result).toEqual(artist);
            expect(mockLogger.info).toHaveBeenCalledWith('Fetching artist with ID: artist-1');
        });
        it('should return null if artist not found', async () => {
            vi.mocked(mockArtistRepository.getArtistById).mockResolvedValue(null);
            const result = await service.getArtistById('not-found');
            expect(result).toBeNull();
        });
    });

    describe('getArtistsByIds', () => {
        it('should fetch multiple artists by IDs', async () => {
            if (!mockArtists[0]) throw new Error('mockArtists[0] is undefined');
            if (!mockArtists[1]) throw new Error('mockArtists[1] is undefined');
            const artist1: Artist = { ...mockArtists[0], id: mockArtists[0].id || 'artist-1', name: mockArtists[0].name || 'Arctic Monkeys' };
            const artist2: Artist = { ...mockArtists[1], id: mockArtists[1]?.id || 'artist-2', name: mockArtists[1]?.name || 'Disclosure' };
            vi.mocked(mockArtistRepository.getArtistsByIds).mockResolvedValue([artist1, artist2]);
            const result = await service.getArtistsByIds(['artist-1', 'artist-2']);
            expect(result).toHaveLength(2);
            expect(result[0]?.id).toBe('artist-1');
        });
    });

    describe('searchArtistByName', () => {
        it('should search artist by name', async () => {
            if (!mockArtists[0]) throw new Error('mockArtists[0] is undefined');
            const artist: Artist = { ...mockArtists[0], id: mockArtists[0].id || 'artist-1', name: mockArtists[0].name || 'Arctic Monkeys' };
            vi.mocked(mockArtistRepository.searchArtistByName).mockResolvedValue(artist);
            const result = await service.searchArtistByName('Arctic Monkeys');
            expect(result).toEqual(artist);
            expect(mockLogger.info).toHaveBeenCalledWith('Searching artists by name: Arctic Monkeys');
        });
    });

    describe('searchArtistsByName', () => {
        it('should search multiple artists by name', async () => {
            if (!mockArtists[0]) throw new Error('mockArtists[0] is undefined');
            if (!mockArtists[1]) throw new Error('mockArtists[1] is undefined');
            const artist1: Artist = { ...mockArtists[0], id: mockArtists[0].id || 'artist-1', name: mockArtists[0].name || 'Arctic Monkeys' };
            const artist2: Artist = { ...mockArtists[1], id: mockArtists[1]?.id || 'artist-2', name: mockArtists[1]?.name || 'Disclosure' };
            vi.mocked(mockArtistRepository.searchArtistsByName).mockResolvedValue([artist1, artist2]);
            const result = await service.searchArtistsByName('Monkeys');
            expect(result).toHaveLength(2);
        });
    });

    describe('saveArtist', () => {
        it('should save artist with existing ID', async () => {
            if (!mockArtists[0]) throw new Error('mockArtists[0] is undefined');
            const validArtist: Artist = { ...mockArtists[0], id: mockArtists[0].id, name: mockArtists[0].name };
            vi.mocked(mockArtistRepository.saveArtist).mockResolvedValue(validArtist);
            await service.saveArtist(validArtist);
            expect(mockArtistRepository.saveArtist).toHaveBeenCalledWith(validArtist);
            expect(mockLogger.info).toHaveBeenCalledWith('Saving artist: Arctic Monkeys');
        });
        it('should generate ID if missing', async () => {
            if (!mockArtists[0]) throw new Error('mockArtists[0] is undefined');
            const artistNoId: Artist = { ...mockArtists[0], id: '', name: mockArtists[0].name };
            // Simulate the repository returning the artist with a generated ID
            vi.mocked(mockArtistRepository.saveArtist).mockResolvedValue({ ...artistNoId, id: 'generated-id' });
            await service.saveArtist(artistNoId);
            expect(artistNoId.id).toBeTruthy();
            expect(mockLogger.warn).toHaveBeenCalledWith('Artist ID is missing, generating a new one.');
        });
    });

    describe('createArtist', () => {
        it('should create and enrich artist using crawler', async () => {
            const createData: CreateArtistData = { name: 'New Artist' };
            const crawledArtist: Artist = { ...mockArtists[0], name: 'New Artist', id: '' };
            vi.mocked(mockArtistCrawlerService.crawlArtistByName).mockResolvedValue(crawledArtist);
            vi.mocked(mockArtistRepository.saveArtist).mockResolvedValue({ ...crawledArtist, id: 'generated-id' });
            const result = await service.createArtist(createData);
            expect(result.id).toBeTruthy();
            expect(result.name).toBe('New Artist');
            expect(mockArtistCrawlerService.crawlArtistByName).toHaveBeenCalledWith('New Artist', expect.any(Object));
        });
    });

    describe('crawlArtistDetails', () => {
        it('should enrich artist by id', async () => {
            if (!mockArtists[0]) throw new Error('mockArtists[0] is undefined');
            const artist: Artist = { ...mockArtists[0], id: mockArtists[0].id || 'artist-1', name: mockArtists[0].name || 'Arctic Monkeys' };
            vi.mocked(mockArtistRepository.getArtistById).mockResolvedValue(artist);
            vi.mocked(mockArtistCrawlerService.crawlArtistByName).mockResolvedValue(artist);
            const result = await service.crawlArtistDetails('artist-1');
            expect(result.name).toBe('Arctic Monkeys');
        });
        it('should throw if artist not found by id', async () => {
            vi.mocked(mockArtistRepository.getArtistById).mockResolvedValue(null);
            await expect(service.crawlArtistDetails('not-found')).rejects.toThrow('Artist with ID not-found not found');
        });
        it('should throw if no name provided', async () => {
            await expect(service.crawlArtistDetails(undefined, {})).rejects.toThrow('Artist name is required to crawl details');
        });
        it('should enrich artist by name', async () => {
            if (!mockArtists[1]) throw new Error('mockArtists[1] is undefined');
            const artist: Artist = { ...mockArtists[1], id: mockArtists[1]?.id || 'artist-2', name: mockArtists[1]?.name || 'Disclosure' };
            vi.mocked(mockArtistCrawlerService.crawlArtistByName).mockResolvedValue(artist);
            const result = await service.crawlArtistDetails(undefined, { name: 'Disclosure' });
            expect(result.name).toBe('Disclosure');
        });
    });

    describe('deleteArtist', () => {
        it('should delete artist by id', async () => {
            vi.mocked(mockArtistRepository.deleteArtist).mockResolvedValue(undefined);
            await service.deleteArtist('artist-1');
            expect(mockArtistRepository.deleteArtist).toHaveBeenCalledWith('artist-1');
            expect(mockLogger.info).toHaveBeenCalledWith('Deleting artist with ID: artist-1');
        });
    });

    describe('getAllArtists', () => {
        it('should fetch all artists', async () => {
            vi.mocked(mockArtistRepository.getAllArtists).mockResolvedValue(mockArtists);
            const result = await service.getAllArtists();
            expect(result).toEqual(mockArtists);
            expect(mockLogger.info).toHaveBeenCalledWith('Fetching all artists');
        });
    });
});
