/**
 * Unit tests for FestivalService
 * Tests festival CRUD operations, caching, and crawling functionality
 */
import type { IFestivalRepository } from '@/lib/repositories/interfaces';
import type { Festival } from '@/lib/schemas';
import type { ICacheService } from '@/lib/services/cache/interfaces';
import type { IFestivalCrawlerService } from '@/lib/services/crawler/interfaces';
import { FestivalService } from '@/lib/services/festival-service';
import type { GrabFestivalData } from '@/lib/services/interfaces';
import type { ILogger } from '@/lib/types/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFestival } from '../mock-data';

// Vitest mocks for all dependencies
const infoMock = vi.fn();
const warnMock = vi.fn();
const errorMock = vi.fn();
const debugMock = vi.fn();
const traceMock = vi.fn();
const mockLogger: ILogger = {
    info: infoMock,
    warn: warnMock,
    error: errorMock,
    debug: debugMock,
    trace: traceMock,
};

const getFestivalByIdMock = vi.fn<IFestivalRepository['getFestivalById']>();
const getAllFestivalsMock = vi.fn<IFestivalRepository['getAllFestivals']>();
const saveFestivalMock = vi.fn<IFestivalRepository['saveFestival']>();
const getFestivalByUrlMock = vi.fn<IFestivalRepository['getFestivalByUrl']>();
const mockFestivalRepository: IFestivalRepository = {
    getFestivalById: getFestivalByIdMock,
    getAllFestivals: getAllFestivalsMock,
    saveFestival: saveFestivalMock,
    getFestivalByUrl: getFestivalByUrlMock,
};

const getCacheMockRaw = vi.fn();
const getCacheMock = getCacheMockRaw as ICacheService['get'];
const setCacheMock = vi.fn<ICacheService['set']>();
const deleteCacheMock = vi.fn<ICacheService['delete']>();
const hasCacheMock = vi.fn<ICacheService['has']>();
const invalidatePatternMock = vi.fn<ICacheService['invalidatePattern']>();
const clearCacheMock = vi.fn<ICacheService['clear']>();
const mockCacheService: ICacheService = {
    get: getCacheMock,
    set: setCacheMock,
    delete: deleteCacheMock,
    has: hasCacheMock,
    invalidatePattern: invalidatePatternMock,
    clear: clearCacheMock,
};

const crawlFestivalMock = vi.fn<IFestivalCrawlerService['crawlFestival']>();
const mockFestivalCrawlerService: IFestivalCrawlerService = {
    crawlFestival: crawlFestivalMock,
};

describe('FestivalService', () => {
    let service: FestivalService;

    // Test data
    const testFestival: Festival = {
        ...mockFestival,
        id: 'festival-123',
        lineup: [
            {
                id: 'act-1',
                festivalName: 'Summer Sound Festival 2024',
                date: '2024-07-20',
                artistName: 'Arctic Monkeys',
                artistId: 'artist-1',
                time: '20:00 - 21:30',
                stage: 'Main Stage',
            },
        ],
    };

    const crawledFestivalData: Festival = {
        id: '', // Will be generated
        name: 'New Festival 2024',
        description: 'A new music festival',
        location: 'London, UK',
        website: 'https://newfestival.com',
        imageUrl: 'https://example.com/festival.jpg',
        lineup: [
            {
                id: '', // Will be generated
                festivalName: 'New Festival 2024',
                date: '2024-08-15',
                artistName: 'Test Artist',
                time: '19:00 - 20:00',
                stage: 'Main Stage',
            },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        service = new FestivalService(mockFestivalRepository, mockFestivalCrawlerService, mockCacheService, mockLogger);
    });

    describe('getFestivalById', () => {
        it('should fetch festival by ID successfully', async () => {
            // Arrange
            getFestivalByIdMock.mockResolvedValue(testFestival);

            // Act
            const result = await service.getFestivalById('festival-123');

            // Assert
            expect(result).toEqual(testFestival);
            expect(mockFestivalRepository.getFestivalById).toHaveBeenCalledWith('festival-123');
            expect(mockLogger.info).toHaveBeenCalledWith('Fetching festival with ID: festival-123');
        });

        it('should return null when festival not found', async () => {
            // Arrange
            getFestivalByIdMock.mockResolvedValue(null);

            // Act
            const result = await service.getFestivalById('non-existent');

            // Assert
            expect(result).toBeNull();
            expect(mockFestivalRepository.getFestivalById).toHaveBeenCalledWith('non-existent');
        });
    });

    describe('getAllFestivals', () => {
        it('should fetch all festivals successfully', async () => {
            // Arrange
            const festivals = [testFestival];
            getAllFestivalsMock.mockResolvedValue(festivals);

            // Act
            const result = await service.getAllFestivals();

            // Assert
            expect(result).toEqual(festivals);
            expect(mockFestivalRepository.getAllFestivals).toHaveBeenCalledOnce();
            expect(mockLogger.info).toHaveBeenCalledWith('Fetching all festivals');
        });
    });

    describe('createFestival', () => {
        it('should create festival with generated ID', async () => {
            // Arrange
            const festivalData: Festival = { ...testFestival, id: '' };
            const savedFestival = { ...festivalData, id: 'generated-id' };
            saveFestivalMock.mockResolvedValue(savedFestival);

            // Act
            const result = await service.createFestival(festivalData);

            // Assert
            expect(result).toBe(savedFestival.id);
            expect(festivalData.id).toBeTruthy(); // ID should be generated
            expect(mockFestivalRepository.saveFestival).toHaveBeenCalledWith(festivalData);
            expect(mockLogger.info).toHaveBeenCalledWith('Creating new festival...');
        });
    });

    describe('grabFestivalData', () => {
        it('should crawl and cache festival data successfully', async () => {
            // Arrange
            const grabData: GrabFestivalData = {
                urls: ['https://festival.com/lineup'],
                name: 'Override Name',
            };

            crawlFestivalMock.mockResolvedValue(crawledFestivalData);
            setCacheMock.mockResolvedValue(undefined);

            // Act
            const result = await service.grabFestivalData(grabData);

            // Assert
            expect(result.festival.name).toBe('Override Name'); // Should use provided name
            expect(result.festival.id).toBeTruthy(); // ID should be generated
            expect(result.festival.lineup[0]?.id).toBeTruthy(); // Act ID should be generated
            expect(result.cacheId).toBeTruthy();

            expect(mockFestivalCrawlerService.crawlFestival).toHaveBeenCalledWith(['https://festival.com/lineup']);
            expect(mockCacheService.set).toHaveBeenCalledWith(
                result.cacheId,
                result.festival,
                24 * 60 * 60 // 24 hours in seconds
            );
            expect(mockLogger.info).toHaveBeenCalledWith('Parsing festival data...');
        });

        it('should handle files in addition to URLs', async () => {
            // Arrange

            const grabData: GrabFestivalData = {
                urls: ['https://festival.com/lineup'],
                files: [
                    { name: 'file1.pdf', type: 'application/pdf', base64: 'base64-data-1' },
                    { name: 'file2.pdf', type: 'application/pdf', base64: 'base64-data-2' },
                ],
            };

            crawlFestivalMock.mockResolvedValue(crawledFestivalData);
            setCacheMock.mockResolvedValue(undefined);

            // Act
            await service.grabFestivalData(grabData);

            // Assert
            expect(mockFestivalCrawlerService.crawlFestival).toHaveBeenCalledWith(['https://festival.com/lineup', 'base64-data-1', 'base64-data-2']);
        });

        it('should use original festival name when no override provided', async () => {
            // Arrange
            const grabData: GrabFestivalData = {
                urls: ['https://festival.com/lineup'],
            };
            // Ensure the crawler returns the correct name for this test
            const originalNameFestival = { ...crawledFestivalData, name: 'New Festival 2024' };
            crawlFestivalMock.mockResolvedValue(originalNameFestival);
            setCacheMock.mockResolvedValue(undefined);

            // Act
            const result = await service.grabFestivalData(grabData);

            // Assert
            expect(result.festival.name).toBe('New Festival 2024'); // Should use crawled name
        });
    });

    describe('getCachedData', () => {
        it('should retrieve cached festival data successfully', async () => {
            // Arrange
            const cacheId = 'cache-123';
            getCacheMockRaw.mockResolvedValue(testFestival);

            // Act
            const result = await service.getCachedData(cacheId);

            // Assert
            expect(result).toEqual(testFestival);
            expect(mockCacheService.get).toHaveBeenCalledWith(cacheId);
            expect(mockLogger.info).toHaveBeenCalledWith(`Retrieving cached festival with ID: ${cacheId}`);
            expect(mockLogger.info).toHaveBeenCalledWith(`Retrieved cached festival: ${testFestival.name}`);
        });

        it('should return null when cached data not found', async () => {
            // Arrange
            const cacheId = 'non-existent-cache';
            getCacheMockRaw.mockResolvedValue(null);

            // Act
            const result = await service.getCachedData(cacheId);

            // Assert
            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith(`No cached festival found with ID: ${cacheId}`);
        });
    });

    describe('saveFestival', () => {
        it('should save festival with existing ID', async () => {
            // Arrange
            saveFestivalMock.mockResolvedValue(testFestival);

            // Act
            await service.saveFestival(testFestival);

            // Assert
            expect(mockFestivalRepository.saveFestival).toHaveBeenCalledWith(testFestival);
            expect(mockLogger.info).toHaveBeenCalledWith(`Saving festival: ${testFestival.name}`);
        });

        it('should generate ID when missing and ensure acts have IDs', async () => {
            // Arrange
            const festivalWithoutId: Festival = {
                ...testFestival,
                id: '',
                lineup: [
                    {
                        id: '',
                        festivalName: 'Summer Sound Festival 2024',
                        date: '2024-07-20',
                        artistName: 'Test Artist',
                        time: '20:00 - 21:30',
                        stage: 'Main Stage',
                    },
                ],
            };
            saveFestivalMock.mockResolvedValue(festivalWithoutId);

            // Act
            await service.saveFestival(festivalWithoutId);

            // Assert
            expect(festivalWithoutId.id).toBeTruthy(); // ID should be generated
            expect(festivalWithoutId.lineup[0]?.id).toBeTruthy(); // Act ID should be generated
            expect(mockLogger.warn).toHaveBeenCalledWith('Festival ID is missing, generating a new one.');
            expect(mockFestivalRepository.saveFestival).toHaveBeenCalledWith(festivalWithoutId);
        });
    });

    describe('deleteFestival', () => {
        it('should throw error for unimplemented delete functionality', async () => {
            // Act & Assert
            await expect(service.deleteFestival('festival-123')).rejects.toThrow('Festival deletion is not implemented yet');
            expect(mockLogger.info).toHaveBeenCalledWith('Deleting festival with ID: festival-123');
        });
    });

    describe('updateFestivalAct', () => {
        it('should update festival act successfully', async () => {
            // Arrange
            getFestivalByIdMock.mockResolvedValue(testFestival);
            saveFestivalMock.mockResolvedValue(testFestival);

            const updates = { artistId: 'new-artist-id' };

            // Act
            await service.updateFestivalAct('festival-123', 'act-1', updates);

            // Assert
            expect(mockFestivalRepository.getFestivalById).toHaveBeenCalledWith('festival-123');
            expect(mockFestivalRepository.saveFestival).toHaveBeenCalledWith(
                expect.objectContaining({
                    lineup: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'act-1',
                            artistId: 'new-artist-id',
                        }),
                    ]),
                })
            );
            expect(mockLogger.info).toHaveBeenCalledWith('Updating festival act: act-1 for festival: festival-123', updates);
        });

        it('should throw error when festival not found', async () => {
            // Arrange
            getFestivalByIdMock.mockResolvedValue(null);

            // Act & Assert
            await expect(service.updateFestivalAct('non-existent', 'act-1', { artistId: 'new-id' })).rejects.toThrow('Festival with ID non-existent not found');
        });

        it('should throw error when act not found in festival', async () => {
            // Arrange
            getFestivalByIdMock.mockResolvedValue(testFestival);

            // Act & Assert
            await expect(service.updateFestivalAct('festival-123', 'non-existent-act', { artistId: 'new-id' })).rejects.toThrow('Act with ID non-existent-act not found in festival festival-123');
        });

        it('should preserve existing act data when updating', async () => {
            // Arrange
            const festivalWithDetailedAct: Festival = {
                ...testFestival,
                lineup: [
                    {
                        id: 'act-1',
                        festivalName: 'Summer Sound Festival 2024',
                        date: '2024-07-20',
                        artistName: 'Arctic Monkeys',
                        artistId: 'original-artist-id',
                        festivalId: 'festival-123',
                        time: '20:00 - 21:30',
                        stage: 'Main Stage',
                    },
                ],
            };

            getFestivalByIdMock.mockResolvedValue(festivalWithDetailedAct);
            saveFestivalMock.mockResolvedValue(festivalWithDetailedAct);

            // Act
            await service.updateFestivalAct('festival-123', 'act-1', { artistId: 'new-artist-id' });

            // Assert
            expect(mockFestivalRepository.saveFestival).toHaveBeenCalledWith(
                expect.objectContaining({
                    lineup: [
                        expect.objectContaining({
                            id: 'act-1',
                            artistName: 'Arctic Monkeys', // Preserved
                            festivalName: 'Summer Sound Festival 2024', // Preserved
                            artistId: 'new-artist-id', // Updated
                            festivalId: 'festival-123', // Preserved
                            date: '2024-07-20', // Preserved
                            time: '20:00 - 21:30', // Preserved
                            stage: 'Main Stage', // Preserved
                        }),
                    ],
                })
            );
        });
    });
});
