/**
 * Unit tests for MusicalAIService
 * Covers AI-powered festival parsing, artist generation, and recommendations
 */
import type { UserPreferences } from '@/lib/schemas';
import type { IAIService } from '@/lib/services/ai/interfaces';
import { MusicalAIService } from '@/lib/services/ai/musical-ai-service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// Mock AI services
const createMockAIService = (): IAIService => ({
    generateCompletion: vi.fn(),
    generateObject: vi.fn(),
    generateStreamObject: vi.fn(),
    getProviderInfo: vi.fn().mockReturnValue({
        name: 'mock-provider',
        model: 'mock-model',
        version: '1.0.0',
    }),
});

describe('MusicalAIService', () => {
    let aiService: IAIService;
    let aiSimpleService: IAIService;
    let musicalAIService: MusicalAIService;

    beforeEach(() => {
        aiService = createMockAIService();
        aiSimpleService = createMockAIService();
        musicalAIService = new MusicalAIService(aiService, aiSimpleService);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('throws error if AI service is not provided', () => {
            expect(() => new MusicalAIService(null as unknown as IAIService, aiSimpleService)).toThrow('AI service is not configured');
        });

        it('throws error if AI simple service is not provided', () => {
            expect(() => new MusicalAIService(aiService, null as unknown as IAIService)).toThrow('AI simple service is not configured');
        });
    });

    describe('generateFestival', () => {
        it('generates festival from inputs', async () => {
            const mockParserResult = {
                festivalName: 'Summer Sound Festival',
                festivalLocation: 'London, UK',
                festivalDescription: 'Amazing music festival',
                lineup: [
                    {
                        date: '2024-07-20',
                        list: [
                            {
                                artistName: 'Test Artist',
                                stage: 'Main Stage',
                                time: '20:00 - 21:30',
                            },
                        ],
                    },
                ],
            };

            vi.mocked(aiService.generateStreamObject).mockResolvedValueOnce(mockParserResult);

            const inputs = ['https://festival.com', 'Summer Sound Festival'];
            const result = await musicalAIService.generateFestival(inputs);

            expect(result).toBeDefined();
            expect(result.name).toBe('Summer Sound Festival');
            expect(result.location).toBe('London, UK');
            expect(aiService.generateStreamObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemPrompt: expect.stringContaining('data scraper/extractor expert'),
                    prompt: expect.stringContaining('Scrape the lineup'),
                    temperature: 0.8,
                    schema: expect.any(z.ZodObject),
                })
            );
        });

        it('retrieves missing festival info in second call', async () => {
            const mockParserResult = {
                festivalName: '',
                festivalLocation: '',
                lineup: [],
            };

            const mockInfoResult = {
                festivalName: 'Retrieved Festival',
                festivalLocation: 'Retrieved Location',
            };

            vi.mocked(aiService.generateStreamObject).mockResolvedValueOnce(mockParserResult).mockResolvedValueOnce(mockInfoResult);

            const inputs = ['https://festival.com'];
            const result = await musicalAIService.generateFestival(inputs);

            expect(aiService.generateStreamObject).toHaveBeenCalledTimes(2);
            expect(result.name).toBe('Retrieved Festival');
            expect(result.location).toBe('Retrieved Location');
        });
    });

    describe('generateArtist', () => {
        it('generates artist from inputs', async () => {
            const mockArtistResult = {
                name: 'Arctic Monkeys',
                genre: ['rock', 'indie'],
                description: 'British rock band',
                imageUrl: 'https://example.com/image.jpg',
                socialLinks: {
                    twitter: 'https://twitter.com/arcticmonkeys',
                },
                sources: ['https://en.wikipedia.org/wiki/Arctic_Monkeys'],
            };

            vi.mocked(aiService.generateObject).mockResolvedValueOnce(mockArtistResult);

            const inputs = ['Arctic Monkeys', 'British rock band'];
            const result = await musicalAIService.generateArtist(inputs);

            expect(result).toBeDefined();
            expect(result.name).toBe('Arctic Monkeys');
            expect(result.genre).toEqual(['rock', 'indie']);
            expect(result.id).toBeTruthy(); // ID should be generated
            expect(aiService.generateObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemPrompt: expect.stringContaining('expert in music and artists'),
                    prompt: expect.stringContaining('Provide detailed information about the artist'),
                    temperature: 0.8,
                    schema: expect.any(z.ZodObject),
                })
            );
        });
    });

    describe('generateRecommendations', () => {
        it('generates recommendations based on user preferences', async () => {
            const userPreferences: UserPreferences = {
                genres: ['rock', 'indie'],
                comment: 'I love energetic live performances',
                recommendationStyle: 'balanced',
                recommendationsCount: 3,
                language: 'en',
            };

            const availableArtists = [
                {
                    festivalName: 'Summer Fest',
                    name: 'Arctic Monkeys',
                    genre: ['rock', 'indie'],
                    description: 'British rock band',
                },
                {
                    festivalName: 'Summer Fest',
                    name: 'The Strokes',
                    genre: ['rock'],
                    description: 'American rock band',
                },
            ];

            const mockRecommendationResult = {
                recommendations: [
                    {
                        artistName: 'Arctic Monkeys',
                        reason: 'Perfect match for rock and indie preferences',
                        score: 0.95,
                    },
                    {
                        artistName: 'The Strokes',
                        reason: 'Great rock band with energetic performances',
                        score: 0.85,
                    },
                ],
            };

            vi.mocked(aiSimpleService.generateStreamObject).mockResolvedValueOnce(mockRecommendationResult);

            const result = await musicalAIService.generateRecommendations({
                userPreferences,
                availableArtists,
            });

            expect(result).toHaveLength(2);
            expect(result[0]?.artistName).toBe('Arctic Monkeys');
            expect(result[0]?.score).toBe(0.95);
            expect(aiSimpleService.generateStreamObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemPrompt: expect.stringContaining('expert music recommender'),
                    prompt: expect.stringContaining('Generate music recommendations'),
                    useStorageCache: true,
                    schema: expect.any(z.ZodObject),
                })
            );
        });

        it('handles different languages', async () => {
            const userPreferences: UserPreferences = {
                genres: ['rock'],
                language: 'fr',
                recommendationsCount: 1,
                recommendationStyle: 'balanced',
            };

            const availableArtists = [
                {
                    festivalName: 'Festival',
                    name: 'Artist',
                    genre: ['rock'],
                    description: 'Description',
                },
            ];

            const mockResult = {
                recommendations: [
                    {
                        artistName: 'Artist',
                        reason: 'Parfait pour le rock',
                        score: 0.8,
                    },
                ],
            };

            vi.mocked(aiSimpleService.generateStreamObject).mockResolvedValueOnce(mockResult);

            await musicalAIService.generateRecommendations({
                userPreferences,
                availableArtists,
            });

            expect(aiSimpleService.generateStreamObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemPrompt: expect.stringContaining('French'),
                })
            );
        });
    });

    describe('generateFestivalParserFunction', () => {
        it('generates parser function from HTML and URL', async () => {
            const mockParserFunction = `
        (() => {
          const lineup = document.querySelectorAll('.artist');
          return { artists: Array.from(lineup).map(el => el.textContent) };
        })();
      `;

            vi.mocked(aiService.generateCompletion).mockResolvedValueOnce({
                content: `\`\`\`javascript\n${mockParserFunction}\n\`\`\``,
                usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
                model: 'test-model',
            });

            const html = '<div class="artist">Test Artist</div>';
            const url = 'https://festival.com';

            const result = await musicalAIService.generateFestivalParserFunction(html, url);

            expect(result).toContain('querySelector');
            expect(result).not.toContain('```'); // Markdown should be stripped
            expect(aiService.generateCompletion).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemPrompt: expect.stringContaining('scraping function in JavaScript'),
                    prompt: expect.stringContaining(url),
                    useStorageCache: false,
                })
            );
        });

        it('strips markdown backticks from parser function', async () => {
            const mockContent = '```javascript\nconsole.log("test");\n```';

            vi.mocked(aiService.generateCompletion).mockResolvedValueOnce({
                content: mockContent,
                usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
                model: 'test-model',
            });

            const result = await musicalAIService.generateFestivalParserFunction('<html></html>', 'https://test.com');

            expect(result).toBe('console.log("test");');
            expect(result).not.toContain('```');
        });
    });

    describe('file handling', () => {
        it('handles URL inputs as files', async () => {
            const mockResult = {
                festivalName: 'Test Festival',
                festivalLocation: 'Test Location',
                lineup: [],
            };

            vi.mocked(aiService.generateStreamObject).mockResolvedValueOnce(mockResult);

            const inputs = ['https://festival.com/lineup', 'https://festival.com/program.pdf'];
            await musicalAIService.generateFestival(inputs);

            expect(aiService.generateStreamObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    files: [
                        { uri: 'https://festival.com/lineup', mimeType: 'text/html' },
                        { uri: 'https://festival.com/program.pdf', mimeType: 'application/pdf' },
                    ],
                })
            );
        });

        it('handles base64 inputs as files', async () => {
            const mockResult = {
                festivalName: 'Test Festival',
                festivalLocation: 'Test Location',
                lineup: [],
            };

            vi.mocked(aiService.generateStreamObject).mockResolvedValueOnce(mockResult);

            const inputs = ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='];
            await musicalAIService.generateFestival(inputs);

            expect(aiService.generateStreamObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    files: [
                        {
                            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                            mimeType: 'image/png',
                        },
                    ],
                })
            );
        });

        it('handles text inputs as prompt additions', async () => {
            const mockResult = {
                festivalName: 'Test Festival',
                festivalLocation: 'Test Location',
                lineup: [],
            };

            vi.mocked(aiService.generateStreamObject).mockResolvedValueOnce(mockResult);

            const inputs = ['Festival name: Summer Sound', 'Location: London'];
            await musicalAIService.generateFestival(inputs);

            expect(aiService.generateStreamObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: expect.stringContaining('Festival name: Summer Sound\nLocation: London'),
                })
            );
        });
    });
});
