/**
 * OpenAI AI service implementation
 */
import type { ILogger } from '@/lib/logger';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { AIProviderConfig, AIRequest, AIResponse, ArtistMatchingRequest, IAIService, RecommendationRequest, StructuredExtractionRequest } from './interfaces';
import { ArtistMatchingResponseSchema, RecommendationsResponseSchema } from './schemas';

/**
 * Interface for chunking results
 */
/*interface ChunkResult<T> {
    chunkIndex: number;
    totalChunks: number;
    data: Partial<T>;
    success: boolean;
    error?: string;
}*/

/**
 * OpenAI API response types
 */
interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenAIChoice {
    message: OpenAIMessage;
    finish_reason: 'stop' | 'length' | 'content_filter' | 'function_call';
    index: number;
}

interface OpenAIUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: OpenAIChoice[];
    usage: OpenAIUsage;
}

/**
 * OpenAI service implementation
 */
export class OpenAIService implements IAIService {
    private readonly apiKey: string;
    private readonly model: string;
    private readonly baseUrl: string;
    private readonly maxTokens: number;
    private readonly temperature: number;

    constructor(
        private readonly config: AIProviderConfig,
        private readonly logger: ILogger
    ) {
        this.apiKey = config.apiKey;
        this.model = config.model;
        this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        this.maxTokens = config.maxTokens || 4000;
        this.temperature = config.temperature || 0;

        this.logger.info('OpenAI service initialized', {
            model: this.model,
            baseUrl: this.baseUrl,
        });
    }

    /**
     * Generate text completion using OpenAI API
     */
    async generateCompletion(request: AIRequest): Promise<AIResponse> {
        try {
            const messages: OpenAIMessage[] = [];

            if (request.systemPrompt) {
                messages.push({
                    role: 'system',
                    content: request.systemPrompt,
                });
            }

            // Simple text message
            messages.push({
                role: 'user',
                content: request.prompt,
            });

            /*if (request.files && request.files.length > 0) {
                // Handle file inputs by converting them to text
                for (const file of request.files) {
                }
            }*/

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    max_tokens: request.maxTokens || this.maxTokens,
                    temperature: request.temperature ?? this.temperature,
                }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
            }

            const data: OpenAIResponse = await response.json();
            const choice = data.choices[0];

            if (!choice) {
                throw new Error('No response from OpenAI API');
            }

            this.logger.debug('OpenAI completion generated', {
                model: data.model,
                usage: data.usage,
                finishReason: choice.finish_reason,
            });

            return {
                content: choice.message.content,
                usage: {
                    promptTokens: data.usage.prompt_tokens,
                    completionTokens: data.usage.completion_tokens,
                    totalTokens: data.usage.total_tokens,
                },
                model: data.model,
                finishReason: choice.finish_reason,
            };
        } catch (error) {
            this.logger.error('Failed to generate OpenAI completion', error instanceof Error ? error : new Error(String(error)));
            throw new Error(`OpenAI completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extract structured data using AI with JSON schema validation
     */
    async extractStructuredData<T>(request: StructuredExtractionRequest<T>): Promise<T> {
        let systemPrompt = `You are a data extraction expert. Extract structured data from the provided text and return it as valid JSON that matches the given schema. Be precise and accurate.

Schema requirements:
- Return only valid JSON
- Follow the exact structure specified
- Include all required fields
- Use appropriate data types`;

        systemPrompt += `\n\nJSON schema: ${JSON.stringify(zodToJsonSchema(request.schema), null, 2)}`;
        if (request.examples) {
            systemPrompt += `\n\nExamples of structured data to guide your extraction:\n${JSON.stringify(request.examples, null, 2)}`;
        }
        const aiRequest: AIRequest = {
            ...request,
            systemPrompt,
            prompt: `${request.prompt ?? ''}\nExtract structured data from the following text:\n\n${request.content}`,
        };

        const response = await this.generateCompletion(aiRequest);

        try {
            const parsedData = JSON.parse(response.content);

            // Validate against schema if Zod schema is provided
            return request.schema.parse(parsedData) as T;
        } catch (error) {
            this.logger.error('Failed to parse structured data', error instanceof Error ? error : new Error(String(error)), {
                rawResponse: response.content,
            });
            throw new Error('Failed to extract valid structured data from AI response');
        }
    }

    /**
     * Match and normalize artist names
     */
    async matchArtist(request: ArtistMatchingRequest): Promise<{
        matchedArtist?: string;
        confidence: number;
        suggestions: string[];
    }> {
        const systemPrompt = `You are an expert in music artist name matching and normalization. Your task is to find the best match for an artist name from a list of existing artists, or suggest the most likely correct name.

Return your response as valid JSON that matches this exact schema:
${JSON.stringify(zodToJsonSchema(ArtistMatchingResponseSchema), null, 2)}

Consider:
- Alternative spellings and capitalization
- Stage names vs real names
- Common abbreviations
- Regional variations

IMPORTANT: Return only valid JSON, no additional text or explanations.`;

        const prompt = `Artist to match: "${request.artistName}"

${request.existingArtists ? `Existing artists to match against:\n${request.existingArtists.join('\n')}` : ''}

${request.contextData ? `Additional context:\n${request.contextData}` : ''}`;

        const aiRequest: AIRequest = {
            ...request,
            systemPrompt,
            prompt,
        };

        const response = await this.generateCompletion(aiRequest);

        try {
            const parsedData = JSON.parse(response.content);
            const validatedResult = ArtistMatchingResponseSchema.parse(parsedData);

            this.logger.debug('Artist matching completed with schema validation', {
                artistName: request.artistName,
                matchedArtist: validatedResult.matchedArtist,
                confidence: validatedResult.confidence,
                suggestionsCount: validatedResult.suggestions.length,
            });

            return {
                ...(validatedResult.matchedArtist && { matchedArtist: validatedResult.matchedArtist }),
                confidence: validatedResult.confidence,
                suggestions: validatedResult.suggestions,
            };
        } catch (error) {
            this.logger.error('Failed to parse or validate artist matching response', error instanceof Error ? error : new Error(String(error)), {
                rawResponse: response.content,
                schema: zodToJsonSchema(ArtistMatchingResponseSchema),
            });

            // Return safe fallback
            return {
                confidence: 0,
                suggestions: [],
            };
        }
    }

    /**
     * Generate personalized recommendations
     */
    async generateRecommendations(request: RecommendationRequest): Promise<unknown[]> {
        const systemPrompt = `You are a music recommendation expert. Analyze user preferences and available artists to generate personalized recommendations.

Return your response as valid JSON that matches this exact schema:
${JSON.stringify(zodToJsonSchema(RecommendationsResponseSchema), null, 2)}

Consider:
- User's preferred genres and artists
- Discovery preferences (conservative/balanced/adventurous)
- Previous feedback and listening history
- Musical similarities and connections

IMPORTANT: Return only valid JSON array, no additional text or explanations.`;

        const prompt = `User preferences: ${JSON.stringify(request.userPreferences, null, 2)}

Available artists: ${JSON.stringify(request.availableArtists, null, 2)}

${request.userHistory ? `User history: ${JSON.stringify(request.userHistory, null, 2)}` : ''}`;

        const aiRequest: AIRequest = {
            ...request,
            systemPrompt,
            prompt,
        };

        const response = await this.generateCompletion(aiRequest);

        try {
            const parsedData = JSON.parse(response.content);
            const validatedRecommendations = RecommendationsResponseSchema.parse(parsedData);

            this.logger.debug('Recommendations generated with schema validation', {
                userPreferences: request.userPreferences,
                recommendationCount: validatedRecommendations.length,
                averageConfidence: validatedRecommendations.reduce((sum, rec) => sum + rec.confidence, 0) / validatedRecommendations.length,
            });

            return validatedRecommendations;
        } catch (error) {
            this.logger.error('Failed to parse or validate recommendations response', error instanceof Error ? error : new Error(String(error)), {
                rawResponse: response.content,
                schema: zodToJsonSchema(RecommendationsResponseSchema),
            });

            // Return empty array as safe fallback
            return [];
        }
    }

    /**
     * Get provider information
     */
    getProviderInfo() {
        return {
            name: 'OpenAI',
            model: this.model,
            version: '1.0.0',
        };
    }
}
