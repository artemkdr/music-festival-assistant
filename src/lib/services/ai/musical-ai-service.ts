/**
 * A wrapper for AI services related to music festivals, artists and recommendations.
 */
import { Artist, ArtistSchema, Festival, ParserFestivalSchema, RecommendationShortSchema, RecommentationsAIResponseSchema, UserPreferences } from '@/lib/schemas';
import type { AIRequest, IAIService, IMusicalAIService } from '@/lib/services/ai/interfaces';
import { mapParserFestivalToFestival } from '@/lib/services/crawler/util';
import { generateArtistId } from '@/lib/utils/id-generator';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

export class MusicalAIService implements IMusicalAIService {
    constructor(
        protected readonly aiService: IAIService,
        protected readonly aiSimpleService: IAIService
    ) {
        if (!this.aiService) {
            throw new Error('AI service is not configured');
        }
        if (!this.aiSimpleService) {
            throw new Error('AI simple service is not configured');
        }
    }

    /**
     * Scrape festival lineup from a URL using AI
     * @param inputs Array of strings containing festival name, website URL, and other relevant data
     */
    public async generateFestival(inputs: string[]): Promise<Festival> {
        const aiRequest: AIRequest = {
            systemPrompt: `
You are a data scraper/extractor expert. 
Your task is to generate detailed music festival information based on the provided festival website, name and other documents (if any).

# Instructions
- First of all, identify the language of the festival website or documents. It will help you to parse the content correctly using the right keywords.
- Festival lineup is normally a list/table of performances or the list/table of artists:
    - If you parse the website, then look for the HTML elements like <table>, <ul>, <ol> or repeating elements like <div>, <p> or similar that contain artist names and related information.
    - Look for the patterns like "lineup", "program", "performances", "shows", "acts", "artists", "stages", "timetable" or similar in English or in the language detected earlier.
    - If you find the lineup, then extract it as a list of acts with stage, artists names and their act time (if available).
- Festival description must be max 500 characters and focused on the festival's atmosphere, history, and unique features.
- Carefully follow the provided JSON schema for the response, because the response will be validated against it.

DO NOT INVENT ANY INFORMATION, DO NOT MAKE UP ANY DETAILS, USE ONLY REAL AND VERIFIED INFORMATION.
`,
            prompt: `Scrape the lineup of the festival from the provided data:`,
            temperature: 0.8, // risky to use lower temperature as it could be stuck in a loop
        };
        this.addFileContentToRequest(aiRequest, inputs);
        // add the most important instructions to the end of the prompt
        aiRequest.prompt += `\n\nDO NOT INVENT ANY INFORMATION, DO NOT MAKE UP ANY DETAILS, USE ONLY REAL AND VERIFIED INFORMATION.`;

        const result = await this.aiService.generateStreamObject<z.infer<typeof ParserFestivalSchema>>({
            ...aiRequest,
            schema: ParserFestivalSchema,
        });

        // check if the result has general information about the festival,
        // if not, then try to extract it one more time, but only the name, location, start and end dates
        if (!result.festivalName || !result.festivalLocation) {
            const festivalInfoSchema = z.object({
                festivalName: z.string().min(1).max(200),
                festivalLocation: z.string().min(1).max(200).optional(),
            });
            const info = await this.aiService.generateStreamObject<z.infer<typeof festivalInfoSchema>>({
                ...aiRequest,
                schema: festivalInfoSchema,
            });
            // if we have some information, then use it
            if (!result.festivalName && info.festivalName) {
                result.festivalName = info.festivalName;
            }
            if (!result.festivalLocation && info.festivalLocation) {
                result.festivalLocation = info.festivalLocation;
            }
        }

        // result is a partial Festival object, we need to generate a proper Festival object
        return mapParserFestivalToFestival(result);
    }

    /**
     * Provide detailed information about an artist using AI
     * @param inputs Array of strings containing artist name, social links, streaming links, etc.
     */
    public async generateArtist(inputs: string[]): Promise<Artist> {
        const aiRequest: AIRequest = {
            systemPrompt: `
You are an expert in music and artists and in searching for detailed information about them. 
Your task is to generate detailed artist information based on the provided artist name and any additional data. 

# Instructions
- Do not invent description, genres, urls and any other information, provide only real and verified information.
- If you don't have enough information, then put the default empty value depending on the field type in the JSON schema.
- Artist description must be max 1000 characters and focused on his live performance and music style, but ONLY if you found one. 
- If you have multiple arists with the same name and you are not sure which one to choose:    
    - Use the context provided in the prompt (festival information), choose a local artist then or from neighbouring country.
    - Use spotify id if it's provided in the prompt to identify the artist.    
- Provide only valid and verified URLs.
- Provide at least 2 genres.
- Carefully follow the provided JSON schema for the response, because the response will be validated against it.
- Provide sources for the information you provide, if available.

DO NOT INVENT ANY INFORMATION, DO NOT MAKE UP ANY DETAILS, USE ONLY REAL AND VERIFIED INFORMATION.
`,
            prompt: 'Provide detailed information about the artist: ',
            temperature: 0.8,
        };
        this.addFileContentToRequest(aiRequest, inputs);

        // Create a "loose" version of ArtistSchema for AI output validation:
        // - Remove id, streamingLinks, popularity fields, because anyway AI generates fakes
        // Clone the base schema and override specific fields
        const looseArtistSchema = ArtistSchema.omit({
            id: true,
            popularity: true,
            streamingLinks: true,
            mappingIds: true,
        }).extend({
            sources: z.array(z.string()).optional(), // Optional sources for the information
        });

        // add the most important instructions to the end of the prompt
        aiRequest.prompt += `\n\nDO NOT INVENT ANY INFORMATION, DO NOT MAKE UP ANY DETAILS, USE ONLY REAL AND VERIFIED INFORMATION.`;

        const result = await this.aiService.generateObject<z.infer<typeof looseArtistSchema>>({
            ...aiRequest,
            schema: looseArtistSchema,
        });
        // we have to intervent here and generate our own ID
        // because AI answer can contain any ID according to schema, even a random one
        // as 'id' is a requited field in the schema
        return {
            ...result,
            id: generateArtistId(), // Generate a new ID for the artist
        };
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
            festivalName: string;
            name: string;
            genre: string[] | undefined;
            description: string | undefined;
        }[];
    }): Promise<z.infer<typeof RecommendationShortSchema>[]> {
        const mappedUserPreferences = {
            comment: userPreferences.comment?.trim() || '',
            preferredGenres: userPreferences.genres?.length ? userPreferences.genres : undefined,
            preferredArtists: userPreferences.preferredArtists?.length ? userPreferences.preferredArtists : undefined,
            recommendationStyle:
                userPreferences.recommendationStyle === 'conservative'
                    ? 'conservative: focus on well-known artists'
                    : userPreferences.recommendationStyle === 'balanced'
                      ? 'balanced: mix of popular and emerging artists'
                      : userPreferences.recommendationStyle === 'adventurous'
                        ? 'adventurous: focus on emerging and less known artists'
                        : '',
            recommendationsCount: `I would like at least ${userPreferences.recommendationsCount || 5} recommendations`, // Default to 5 if not specified
        };
        const aiRequest: AIRequest = {
            systemPrompt: `
You are an expert music recommender. You help users choose an artist from a list of available artists, based on their preferences.

# Instructions
- Focus on the user's comment provided in the prompt and his favorite genres.
- It's about a music festival, so focus on live performances, but do not invent any details, use only real information, reviews or articles about how the artist performs live.
- Provide at least 2 recommendations.
- If the user preferences are too vague for you to make a decision, then provide at least 1 recommendation based on the available artists.
- Carefully follow the provided JSON schema for the response, because the response will be validated against it.

DO NOT INVENT ANY INFORMATION, DO NOT MAKE UP ANY DETAILS, USE ONLY REAL AND VERIFIED INFORMATION.
`,
            prompt: `
Generate music recommendations based on the provided user preferences:
`,
        };
        this.addFileContentToRequest(aiRequest, [`User preferences: ${JSON.stringify(mappedUserPreferences)}`, `Available artists: ${JSON.stringify(availableArtists)}`]);

        // add the most important instructions to the end of the prompt
        aiRequest.prompt += `\n\nDO NOT INVENT ANY INFORMATION, DO NOT MAKE UP ANY DETAILS, USE ONLY REAL AND VERIFIED INFORMATION.`;
        aiRequest.useStorageCache = true; // Use local/remote cache for responses

        const result = await this.aiSimpleService.generateStreamObject<z.infer<typeof RecommentationsAIResponseSchema>>({
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
     * Generate a parser function for a given HTML schema.
     * It works much better than generating a full festival object from an url or HTML content.
     * This one generates only a parser function that can be used to extract data from the HTML content.
     * It uses much less output tokens and is more reliable.
     * @param schema Zod schema to generate the parser function for
     * @returns Function that takes HTML content and URL, returns parsed data as a string
     */
    async generateFestivalParserFunction(html: string, url: string): Promise<string> {
        const aiRequest = {
            systemPrompt: `Provide a scraping function in JavaScript that extracts and returns data according to a schema from the current page. The function must be IIFE. No comments or imports. No console.log. The code you generate will be executed straight away, you shouldn't output anything besides runnable code`,
            prompt: `
                Website: ${url}
                Schema: ${JSON.stringify(zodToJsonSchema(ParserFestivalSchema))}
                Content: ${html}
            `,
            useStorageCache: false,
        };
        const parserFunction = await this.aiService.generateCompletion(aiRequest);
        return this.stripMarkdownBackticks(parserFunction.content);
    }

    private stripMarkdownBackticks(text: string) {
        let trimmed = text.trim();
        trimmed = trimmed.replace(/^```(?:javascript)?\s*/i, '');
        trimmed = trimmed.replace(/\s*```$/i, '');
        return trimmed;
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
