/**
 * Unit tests for RecommendationService
 * Tests the core recommendation logic with mocked dependencies
 */
import type { IArtistRepository } from '@/lib/repositories/interfaces';
import type { Festival, UserPreferences } from '@/lib/schemas';
import type { IMusicalAIService } from '@/lib/services/ai/interfaces';
import { RecommendationService } from '@/lib/services/recommendation-service';
import type { ILogger } from '@/lib/types/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockArtists, mockFestival } from '../mock-data';

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

const generateRecommendationsMock = vi.fn<IMusicalAIService['generateRecommendations']>();
const generateFestivalMock = vi.fn<IMusicalAIService['generateFestival']>();
const generateArtistMock = vi.fn<IMusicalAIService['generateArtist']>();
const generateFestivalParserFunctionMock = vi.fn<IMusicalAIService['generateFestivalParserFunction']>();
const mockAIService: IMusicalAIService = {
    generateRecommendations: generateRecommendationsMock,
    generateFestival: generateFestivalMock,
    generateArtist: generateArtistMock,
    generateFestivalParserFunction: generateFestivalParserFunctionMock,
};

const getArtistByIdMock = vi.fn<IArtistRepository['getArtistById']>();
const getArtistsByIdsMock = vi.fn<IArtistRepository['getArtistsByIds']>();
const searchArtistByNameMock = vi.fn<IArtistRepository['searchArtistByName']>();
const searchArtistsByNameMock = vi.fn<IArtistRepository['searchArtistsByName']>();
const saveArtistMock = vi.fn<IArtistRepository['saveArtist']>();
const deleteArtistMock = vi.fn<IArtistRepository['deleteArtist']>();
const getAllArtistsMock = vi.fn<IArtistRepository['getAllArtists']>();
const getArtistsByGenresMock = vi.fn<IArtistRepository['getArtistsByGenres']>();
const mockArtistRepository: IArtistRepository = {
    getArtistById: getArtistByIdMock,
    getArtistsByIds: getArtistsByIdsMock,
    searchArtistByName: searchArtistByNameMock,
    searchArtistsByName: searchArtistsByNameMock,
    saveArtist: saveArtistMock,
    deleteArtist: deleteArtistMock,
    getAllArtists: getAllArtistsMock,
    getArtistsByGenres: getArtistsByGenresMock,
};

describe('RecommendationService', () => {
    let service: RecommendationService;

    // Test data
    const testUserPreferences: UserPreferences = {
        genres: ['Electronic', 'Alternative Rock'],
        preferredArtists: ['Arctic Monkeys'],
        dislikedArtists: [],
        language: 'en',
        comment: 'I love energetic performances',
        recommendationStyle: 'balanced',
        recommendationsCount: 3,
        date: '2024-07-20',
    };

    const testFestival: Festival = {
        ...mockFestival,
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
            {
                id: 'act-2',
                festivalName: 'Summer Sound Festival 2024',
                date: '2024-07-20',
                artistName: 'Disclosure',
                artistId: 'artist-2',
                time: '22:00 - 23:30',
                stage: 'Electronic Stage',
            },
            {
                id: 'act-3',
                festivalName: 'Summer Sound Festival 2024',
                date: '2024-07-21',
                artistName: 'Tame Impala',
                artistId: 'artist-3',
                time: '19:00 - 20:30',
                stage: 'Main Stage',
            },
        ],
    };

    const mockAIRecommendations = [
        {
            artistId: 'artist-1',
            artistName: 'Arctic Monkeys',
            score: 0.95,
            reasons: ['Matches your preferred genres', 'High energy performance style'],
        },
        {
            artistId: 'artist-2',
            artistName: 'Disclosure',
            score: 0.88,
            reasons: ['Electronic music match', 'Popular at festivals'],
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        service = new RecommendationService(mockLogger, mockAIService, mockArtistRepository);
    });

    describe('generateAIEnhancedRecommendations', () => {
        it('should generate recommendations successfully with complete data', async () => {
            // Arrange
            generateRecommendationsMock.mockResolvedValue(mockAIRecommendations);
            if (!mockArtists[0] || !mockArtists[1]) throw new Error('mockArtists[0] or [1] is undefined');
            getArtistByIdMock
                .mockResolvedValueOnce({
                    ...mockArtists[0],
                    mappingIds: mockArtists[0].mappingIds ?? {},
                    streamingLinks: mockArtists[0].streamingLinks ?? {},
                    socialLinks: mockArtists[0].socialLinks ?? {},
                }) // Arctic Monkeys
                .mockResolvedValueOnce({
                    ...mockArtists[1],
                    mappingIds: mockArtists[1].mappingIds ?? {},
                    streamingLinks: mockArtists[1].streamingLinks ?? {},
                    socialLinks: mockArtists[1].socialLinks ?? {},
                }); // Disclosure

            // Act
            const result = await service.generateAIEnhancedRecommendations(testFestival, testUserPreferences);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                artist: expect.objectContaining({
                    name: 'Arctic Monkeys',
                    genre: ['Alternative Rock', 'Indie Rock'],
                }),
                act: expect.objectContaining({
                    artistName: 'Arctic Monkeys',
                    date: '2024-07-20',
                    stage: 'Main Stage',
                }),
                score: 0.95,
                reasons: ['Matches your preferred genres', 'High energy performance style'],
                aiEnhanced: true,
            });

            expect(mockLogger.info).toHaveBeenCalledWith('Generating AI-enhanced recommendations', {
                festivalId: testFestival.id,
                userGenres: testUserPreferences.genres,
            });
        });

        it('should handle missing artist data gracefully', async () => {
            // Arrange
            generateRecommendationsMock.mockResolvedValue([
                {
                    artistId: '',
                    artistName: 'Unknown Artist',
                    score: 0.75,
                    reasons: ['Great match for your taste'],
                },
            ]);
            getArtistByIdMock.mockResolvedValue(null);
            searchArtistByNameMock.mockResolvedValue(null);

            const festivalWithUnknownArtist: Festival = {
                ...testFestival,
                lineup: [
                    {
                        id: 'act-unknown',
                        festivalName: 'Summer Sound Festival 2024',
                        date: '2024-07-20',
                        artistName: 'Unknown Artist',
                        time: '18:00 - 19:00',
                        stage: 'Side Stage',
                    },
                ],
            };

            // Act
            const result = await service.generateAIEnhancedRecommendations(festivalWithUnknownArtist, testUserPreferences);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                artist: expect.objectContaining({
                    name: 'Unknown Artist',
                    id: '',
                }),
                act: expect.objectContaining({
                    artistName: 'Unknown Artist',
                }),
                score: 0.75,
                aiEnhanced: true,
            });
        });

        it('should filter acts by date when date preference is provided', async () => {
            // Arrange
            const dateFilterPreferences: UserPreferences = {
                ...testUserPreferences,
                date: '2024-07-21', // Different date
            };

            generateRecommendationsMock.mockResolvedValue([
                {
                    artistId: 'artist-3',
                    artistName: 'Tame Impala',
                    score: 0.92,
                    reasons: ['Perfect psychedelic match'],
                },
            ]);
            if (!mockArtists[2]) throw new Error('mockArtists[2] is undefined');
            getArtistByIdMock.mockResolvedValue({
                ...mockArtists[2],
                mappingIds: mockArtists[2].mappingIds ?? {},
                streamingLinks: mockArtists[2].streamingLinks ?? {},
                socialLinks: mockArtists[2].socialLinks ?? {},
            }); // Tame Impala

            // Act
            const result = await service.generateAIEnhancedRecommendations(testFestival, dateFilterPreferences);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]?.act.date).toBe('2024-07-21');
            expect(result[0]?.artist.name).toBe('Tame Impala');
        });

        it('should throw error when no artists found for specified date', async () => {
            // Arrange
            const noArtistsPreferences: UserPreferences = {
                ...testUserPreferences,
                date: '2024-07-25', // Date with no artists
            };

            // Act & Assert
            await expect(service.generateAIEnhancedRecommendations(testFestival, noArtistsPreferences)).rejects.toThrow(
                'AI recommendation generation failed, falling back to traditional recommendations'
            );

            expect(mockLogger.error).toHaveBeenCalledWith('No artists found for the specified date');
        });

        it('should handle AI service failures and throw appropriate error', async () => {
            // Arrange
            const aiError = new Error('AI service is temporarily unavailable');
            generateRecommendationsMock.mockRejectedValue(aiError);
            if (!mockArtists[0]) throw new Error('mockArtists[0] is undefined');
            getArtistByIdMock.mockResolvedValue({
                ...mockArtists[0],
                mappingIds: mockArtists[0].mappingIds ?? {},
                streamingLinks: mockArtists[0].streamingLinks ?? {},
                socialLinks: mockArtists[0].socialLinks ?? {},
            });

            // Act & Assert
            await expect(service.generateAIEnhancedRecommendations(testFestival, testUserPreferences)).rejects.toThrow(
                'AI recommendation generation failed, falling back to traditional recommendations'
            );

            expect(mockLogger.error).toHaveBeenCalledWith('AI recommendation generation failed, falling back to traditional', aiError);
        });

        it('should prefer future acts when no specific date is provided', async () => {
            // Arrange
            const noDatePreferences: UserPreferences = {
                ...testUserPreferences,
                date: undefined,
            };

            // Mock current date to be before festival dates
            vi.stubGlobal(
                'Date',
                class extends Date {
                    constructor() {
                        super('2024-07-19T00:00:00Z'); // Before festival
                    }
                    static now() {
                        return new Date('2024-07-19T00:00:00Z').getTime();
                    }
                }
            );

            generateRecommendationsMock.mockResolvedValue([
                {
                    artistId: 'artist-1',
                    artistName: 'Arctic Monkeys',
                    score: 0.9,
                    reasons: ['Great future performance'],
                },
            ]);
            if (!mockArtists[0]) throw new Error('mockArtists[0] is undefined');
            getArtistByIdMock.mockResolvedValue({
                ...mockArtists[0],
                mappingIds: mockArtists[0].mappingIds ?? {},
                streamingLinks: mockArtists[0].streamingLinks ?? {},
                socialLinks: mockArtists[0].socialLinks ?? {},
            });

            // Act
            const result = await service.generateAIEnhancedRecommendations(testFestival, noDatePreferences);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]?.act.date).toBe('2024-07-20'); // Should pick the first future act
            if (!result[0]?.act.date) throw new Error('result[0]?.act.date is undefined');
            expect(new Date(result[0]?.act.date)).toBeInstanceOf(Date);

            // Restore original Date
            vi.unstubAllGlobals();
        });

        it('should handle empty AI recommendations', async () => {
            // Arrange
            generateRecommendationsMock.mockResolvedValue([]);

            // Act
            const result = await service.generateAIEnhancedRecommendations(testFestival, testUserPreferences);

            // Assert
            expect(result).toHaveLength(0);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'AI-enhanced recommendations generated',
                expect.objectContaining({
                    aiRecommendationsCount: 0,
                    finalCount: 0,
                })
            );
        });

        it('should use default values for missing user preference fields', async () => {
            // Arrange
            const minimalPreferences: UserPreferences = {
                genres: ['Electronic'],
                recommendationStyle: 'balanced',
                recommendationsCount: 5,
            };

            generateRecommendationsMock.mockResolvedValue(mockAIRecommendations);
            if (!mockArtists[1]) throw new Error('mockArtists[1] is undefined');
            getArtistByIdMock.mockResolvedValue({
                ...mockArtists[1],
                mappingIds: mockArtists[1].mappingIds ?? {},
                streamingLinks: mockArtists[1].streamingLinks ?? {},
                socialLinks: mockArtists[1].socialLinks ?? {},
            });

            // Act
            await service.generateAIEnhancedRecommendations(testFestival, minimalPreferences);

            // Assert
            expect(generateRecommendationsMock).toHaveBeenCalledWith({
                userPreferences: expect.objectContaining({
                    language: 'en', // Default language
                    recommendationsCount: 5, // Default count
                    preferredArtists: [], // Default empty array
                    dislikedArtists: [], // Default empty array
                }),
                availableArtists: expect.any(Array),
            });
        });
    });
});
