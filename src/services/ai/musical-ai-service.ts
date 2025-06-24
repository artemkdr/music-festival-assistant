/**
 * A wrapper for AI services related to music festivals, artists and recommendations.
 */
import { ArtistSchema, FestivalShortSchema, RecommendationShortSchema, RecommentationsAIResponseSchema } from '@/schemas';
import type { AIRequest, IAIService, IMusicalAIService } from '@/services/ai/interfaces';
import { Artist, Festival, generateArtistId, generateFestivalId, generatePerformanceId, UserPreferences } from '@/schemas';
import { z } from 'zod';

export class MusicalAIService implements IMusicalAIService {
    constructor(protected readonly aiService: IAIService) {
        if (!this.aiService) {
            throw new Error('AI service is not configured');
        }
    }

    /**
     * Scrape festival lineup from a URL using AI
     * @param inputs Array of strings containing festival name, website URL, and other relevant data
     */
    public async generateFestival(inputs: string[]): Promise<Festival> {
        const aiRequest: AIRequest = {
            systemPrompt: 'You are a data scraper/extractor expert. Your task is to generate detailed music festival information based on the provided festival name and its website.',
            prompt: 'Scrape the lineup of the festival from the provided data.',
            temperature: 0.8, // risky to use lower temperature as it could be stuck in a loop
        };
        this.addFileContentToRequest(aiRequest, inputs);
        const result = await this.aiService.generateObject<z.infer<typeof FestivalShortSchema>>({
            ...aiRequest,
            schema: FestivalShortSchema,
        });
        // result is a partial Festival object, we need to generate a proper Festival object
        const festival: Festival = {
            id: generateFestivalId({
                name: result.name,
                location: result.location,
                startDate: result.startDate,
                endDate: result.endDate,
            }),
            name: result.name,
            location: result.location,
            startDate: result.startDate,
            endDate: result.endDate,
            description: result.description,
            imageUrl: result.imageUrl,
            stages: result.stages || [],
            performances: result.performances.map(performance => ({
                ...performance,
                id: generatePerformanceId(result.name),
                artist: {
                    ...performance.artist,
                    id: generateArtistId(),
                },
            })),
            website: result.website || '',
        };
        return festival;
    }

    /**
     * Provide detailed information about an artist using AI
     * @param inputs Array of strings containing artist name, social links, streaming links, etc.
     */
    public async generateArtist(inputs: string[]): Promise<Artist> {
        const aiRequest: AIRequest = {
            systemPrompt: `You are an expert in music and artists. 
Your task is to generate detailed artist information based on the provided artist name and any additional data. 
Artist description must be max 1000 characters and focused on his live performance and music style. 
Important:
- do not invent any details and urls, provide only real information;
- provide only valid URLs;
- provide at least 2 genres;
- the response must be a valid schema provided in the request;`,
            prompt: 'Provide detailed information about the artist: ',
            temperature: 0.8,
        };
        this.addFileContentToRequest(aiRequest, inputs);

        // Create a "loose" version of ArtistSchema for AI output validation:
        // - Remove id, streamingLinks, popularity fields, because anyway AI generates fakes
        // Clone the base schema and override specific fields
        const looseArtistSchema = ArtistSchema.omit({ 
            id: true, popularity: true, streamingLinks: true, mappingIds: true 
        });

        const result = await this.aiService.generateObject<Artist>({
            ...aiRequest,
            schema: looseArtistSchema,
        });
        // we have to intervent here and generate our own ID
        result.id = generateArtistId();
        return result;
    }

    /**
     * Generate music recommendations based on user preferences
     * @param inputs Array of strings containing user preferences, genres, artists, etc.
     * @returns Array of recommended artists
     */
    public async generateRecommendations({
        userPreferences,
        availableArtists,
    }: {
        userPreferences: UserPreferences;
        availableArtists: {
            id: string;
            name: string;
            genre: string[] | undefined;
            description: string | undefined;
        }[];
    }): Promise<z.infer<typeof RecommendationShortSchema>[]> {
        const aiRequest: AIRequest = {
            systemPrompt: `You are an expert music recommender. Stick to user preferences genres.`,
            prompt: 'Generate music recommendations based on the provided user preferences and favorite artists.',
        };
        this.addFileContentToRequest(aiRequest, [`User preferences: ${JSON.stringify(userPreferences)}`, `Available artists: ${JSON.stringify(availableArtists)}`]);
        const result = await this.aiService.generateObject<z.infer<typeof RecommentationsAIResponseSchema>>({
            ...aiRequest,
            // remove score strict requirement for 0 to 1 range, AI can return any value
            schema: z.object({
                ...RecommentationsAIResponseSchema.shape,
                score: z.number(),
            }),
        });
        return result.recommendations;
    }

    /**
     * Prepare AI request
     */
    private async addFileContentToRequest(aiRequest: AIRequest, inputs: string[]): Promise<AIRequest> {
        if (!inputs || inputs.length === 0) {
            return aiRequest;
        }
        inputs.forEach(async (input, index) => {
            // if input is an URL, treat it as a file
            if (input.startsWith('http://') || input.startsWith('https://')) {
                aiRequest.files = aiRequest.files || [];

                if (input.endsWith('.pdf')) {
                    aiRequest.files.push({
                        uri: input,
                        mimeType: 'application/pdf',
                    });
                } else {
                    aiRequest.files.push({
                        uri: input,
                        mimeType: 'text/html',
                    });
                }
            }
            // if input as a base64 string, treat it as a file
            else if (input.startsWith('data:')) {
                aiRequest.files = aiRequest.files || [];
                const [mimeType, base64Data] = input.split(',');
                if (!base64Data) {
                    throw new Error(`Invalid base64 input at index ${index}`);
                }
                if (!mimeType?.startsWith('data:')) {
                    throw new Error(`Invalid MIME type in base64 input at index ${index}`);
                }
                aiRequest.files.push({
                    data: base64Data,
                    mimeType: mimeType.split(':')[1]?.split(';')[0] || 'image/*', // Extract MIME type from data URL
                });
            } else {
                aiRequest.prompt += `\n${input}`;
            }
        });
        return aiRequest;
    }
}
