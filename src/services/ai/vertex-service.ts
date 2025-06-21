/**
 * Google Vertex AI service implementation
 */
import type { ILogger } from '@/lib/logger';
import { chunkText } from '@/services/ai/utils/chunk';
import { mergeResults } from '@/services/ai/utils/merge';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { VertexAI, HarmCategory, HarmBlockThreshold, Part } from '@google-cloud/vertexai';
import path from 'path';
import type { AIProviderConfig, AIRequest, AIResponse, ArtistMatchingRequest, IAIService, RecommendationRequest, StructuredExtractionRequest } from './interfaces';
import { ArtistMatchingResponseSchema, RecommendationsResponseSchema } from './schemas';

/**
 * Configuration constants for chunking large data
 */
const CHUNKING_CONFIG = {
    // Approximate token estimation (characters to tokens ratio)
    CHARS_PER_TOKEN: 4,
    // Maximum tokens per chunk (leaving room for system prompt and response)
    MAX_CHUNK_TOKENS: 4000,
    // Maximum characters per chunk
    MAX_CHUNK_CHARS: 16000,
    // Overlap between chunks to maintain context
    CHUNK_OVERLAP_CHARS: 500,
    // Minimum chunk size to process
    MIN_CHUNK_CHARS: 1000,
} as const;

/**
 * Google Vertex AI service implementation
 */
export class VertexAIService implements IAIService {
    private readonly vertexAI: VertexAI;
    private readonly model: string;
    private readonly projectId: string;
    private readonly location: string;
    private readonly maxTokens: number;
    private readonly temperature: number;

    constructor(
        private readonly config: AIProviderConfig,
        private readonly logger: ILogger
    ) {
        this.model = config.model || 'gemini-2.5-flash';
        this.projectId = config.projectId || process.env.VERTEX_PROJECT_ID || 'api-for-bcars';
        this.location = config.location || process.env.VERTEX_LOCATION || 'us-central1';
        this.maxTokens = config.maxTokens || 30000;
        this.temperature = config.temperature || 0.7; // Initialize VertexAI with service account credentials
        // Set the environment variable for authentication
        process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), 'google-vertex-api-key.json');

        this.vertexAI = new VertexAI({
            project: this.projectId,
        });

        this.logger.info('Vertex AI service initialized', {
            model: this.model,
            projectId: this.projectId,
        });
    } /**
     * Generate text completion using Vertex AI SDK
     */
    async generateCompletion(request: AIRequest): Promise<AIResponse> {
        try {
            // Get the generative model
            const generativeModel = this.vertexAI.getGenerativeModel({
                model: this.model,
                generationConfig: {
                    temperature: request.temperature ?? this.temperature,
                    //maxOutputTokens: request.maxTokens || this.maxTokens,
                    topP: 0.95,
                    topK: 40,
                },
                safetySettings: [
                    {
                        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                ],
                systemInstruction: request.systemPrompt || '',
            });

            const userParts: Part[] = [
                {
                    text: request.prompt || '',
                },
            ];
            if (request.files && request.files.length > 0) {
                request.files.forEach(file => {
                    if (file.uri) {
                        userParts.push({
                            fileData: {
                                mimeType: file.mimeType,
                                fileUri: file.uri,
                            },
                        });
                    } else if (file.data) {
                        userParts.push({
                            inlineData: {
                                mimeType: file.mimeType,
                                data: file.data,
                            },
                        });
                    }
                });
            }

            // Generate content (text-only for now)
            const result = await generativeModel.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: userParts,
                    },
                ],
            });
            const response = result.response;

            if (!response) {
                throw new Error('No response from Vertex AI');
            }

            const candidates = response.candidates;
            if (!candidates || candidates.length === 0) {
                throw new Error('No candidates in Vertex AI response');
            }

            const text = candidates[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error('No text content in Vertex AI response');
            }

            const usageMetadata = response.usageMetadata;

            this.logger.debug('Vertex AI completion generated', {
                model: this.model,
                usage: usageMetadata,
                textLength: text.length,
            });

            return {
                content: text,
                usage: usageMetadata
                    ? {
                          promptTokens: usageMetadata.promptTokenCount || 0,
                          completionTokens: usageMetadata.candidatesTokenCount || 0,
                          totalTokens: usageMetadata.totalTokenCount || 0,
                      }
                    : {
                          promptTokens: 0,
                          completionTokens: 0,
                          totalTokens: 0,
                      },
                model: this.model,
                finishReason: 'stop', // Vertex AI SDK handles this internally
            };
        } catch (error) {
            this.logger.error('Failed to generate Vertex AI completion', error instanceof Error ? error : new Error(String(error)));
            throw new Error(`Vertex AI completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            const parsedData = JSON.parse(this.removeMarkdownWrapper(response.content));

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
     * Parse festival data from various sources (robust to large data via chunking)
     */
    async parseFestivalData<T>(request: StructuredExtractionRequest<T>): Promise<T> {
        // --- Helper: Estimate token count ---
        const estimateTokens = (text: string) => Math.ceil(text.length / CHUNKING_CONFIG.CHARS_PER_TOKEN);
        const prompt = 'Parse the following festival data and extract artist lineup information. Return structured data with artist name, stage, day and time';
        // --- Main logic ---
        const systemPrompt = `
You are an expert in parsing festival data. 
Extract artist lineup information from festival data.
Try to find repeated patterns and structures in the data, normally the lineup is structured day by day with the artists by stage and time.
Or it could be a list of artists with their stage, day and time.

Return your response as valid JSON that matches this exact schema:\n${JSON.stringify(zodToJsonSchema(request.schema), null, 2)}\n\nIMPORTANT: Return only valid JSON, no additional text or explanations.`;

        const data = request.content;
        const maxChunkChars = CHUNKING_CONFIG.MAX_CHUNK_CHARS;
        const overlap = CHUNKING_CONFIG.CHUNK_OVERLAP_CHARS;
        const needsChunking = estimateTokens(data) > CHUNKING_CONFIG.MAX_CHUNK_TOKENS;

        if (!needsChunking) {
            // --- Single chunk processing ---
            const aiRequest: AIRequest = {
                ...request,
                systemPrompt,
                prompt: `${prompt} :\n\n${data}`,
            };
            const response = await this.generateCompletion(aiRequest);
            try {
                const parsedData = JSON.parse(this.removeMarkdownWrapper(response.content));
                const validatedData = request.schema.parse(parsedData) as T;
                this.logger.debug('Festival data parsed with schema validation', {
                    dataSize: data.length,
                    parsedFields: Object.keys(validatedData || {}),
                });
                return validatedData;
            } catch (error) {
                this.logger.error('Failed to parse or validate festival data', error instanceof Error ? error : new Error(String(error)), {
                    rawResponse: response.content,
                    schema: zodToJsonSchema(request.schema),
                });
                return { rawData: response.content } as T;
            }
        }

        // --- Chunked processing ---
        const chunks = chunkText(data, maxChunkChars, overlap);
        this.logger.info('Festival data is large, using chunked AI parsing', {
            totalLength: data.length,
            chunkCount: chunks.length,
            chunkSize: maxChunkChars,
        });
        const results: Partial<T>[] = [];
        for (let i = 0; i < Math.min(100, chunks.length); i++) {
            const chunk = chunks[i];
            const aiRequest: AIRequest = {
                ...request,
                systemPrompt,
                prompt: `${prompt} (chunk ${i + 1} of ${chunks.length}):\n\n${chunk}`,
            };
            try {
                const response = await this.generateCompletion(aiRequest);
                const parsedData = JSON.parse(this.removeMarkdownWrapper(response.content));
                const validatedData = request.schema.parse(parsedData) as Partial<T>;
                results.push(validatedData);
                this.logger.debug('Chunk parsed successfully', { chunk: i + 1, totalChunks: chunks.length });
            } catch (error) {
                this.logger.error('Failed to parse/validate chunk', error instanceof Error ? error : new Error(String(error)), {
                    chunk: i + 1,
                    totalChunks: chunks.length,
                });
                // Optionally push partial/fallback data
            }
        }
        if (results.length === 0) {
            this.logger.error('All chunks failed to parse, returning empty result');
            return { rawData: '' } as T;
        }
        // Merge all chunked results
        const merged = mergeResults(results);
        this.logger.info('Merged chunked festival data', {
            chunkCount: chunks.length,
            mergedKeys: Object.keys(merged as object),
        });
        return merged;
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
            const parsedData = JSON.parse(this.removeMarkdownWrapper(response.content));
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
            const parsedData = JSON.parse(this.removeMarkdownWrapper(response.content));
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
     * remove markdown wrapper fro JSON
     */
    private removeMarkdownWrapper(json: string): string {
        // Remove any markdown code block syntax
        return json.replace(/```json\s*([\s\S]*?)\s*```/gi, '$1').trim();
    }

    /**
     * Get provider information
     */
    getProviderInfo() {
        return {
            name: 'Google Vertex AI',
            model: this.model,
            version: '1.0.0',
        };
    }
}
