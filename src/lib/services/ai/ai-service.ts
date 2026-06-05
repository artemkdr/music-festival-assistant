import { AIProviderConfig, AIRequest, AIResponse, IAIService, SchemaAIRequest } from '@/lib/services/ai/interfaces';
import { ICacheService } from '@/lib/services/cache/interfaces';
import type { ILogger } from '@/lib/types/logger';
import { toError } from '@/lib/utils/error-handler';
import { createVertex } from '@ai-sdk/google-vertex/edge';
import { groq } from '@ai-sdk/groq';
import { openai } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output, streamText } from 'ai';
import { hash } from 'ohash';

export class AIService implements IAIService {
    private readonly maxTokens: number;
    private readonly maxRetries: number = 3; // Default retry count
    private readonly temperature: number;
    private readonly model: ReturnType<typeof openai>;

    /**
     * Default cache TTL in seconds
     */
    private readonly DEFAULT_CACHE_TTL = 3 * 24 * 60 * 60; // 3 days

    constructor(
        private readonly config: AIProviderConfig,
        private readonly cache: ICacheService,
        private readonly logger: ILogger
    ) {
        switch (config.provider) {
            case 'openrouter':
                this.model = createOpenRouter({
                    apiKey: config.apiKey,
                    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
                } as const)(config.model);
                break;
            case 'openai':
                this.model = openai(config.model);
                break;
            case 'groq':
                this.model = groq(config.model);
                break;
            default:
                if (!config.projectId) {
                    throw new Error('Project ID is required for Vertex AI');
                }
                if (!config.clientEmail || !config.privateKey || !config.privateKeyId) {
                    throw new Error('Google service account credentials are required for Vertex AI');
                }
                this.model = createVertex({
                    project: config.projectId,
                    location: config.location || 'us-central1', // Default to us-central1 if not specified
                    googleCredentials: {
                        clientEmail: config.clientEmail,
                        privateKey: config.privateKey,
                        privateKeyId: config.privateKeyId,
                    },
                })(config.model); // Initialize Vertex AI model
        }
        this.maxTokens = config.maxTokens || 30000;
        this.temperature = config.temperature || 0.8; // Initialize VertexAI with service account credentials
    }

    /**
     * Generate a deterministic cache key for a given request
     */
    private static generateCacheKey(input: AIRequest): string {
        return `aiservice-${hash(input)}`;
    }

    /**
     * Generate text completion using Vertex AI SDK
     */
    async generateCompletion(request: AIRequest): Promise<AIResponse> {
        try {
            const cacheKey = AIService.generateCacheKey(request);
            if (request.useStorageCache === true && (await this.cache.has(cacheKey))) {
                this.logger.debug(`Cache hit for request ${cacheKey}`);
                const cacheResponse = await this.cache.get<AIResponse>(cacheKey);
                if (cacheResponse) {
                    return cacheResponse;
                } else {
                    this.logger.warn(`Cache hit for request ${cacheKey} but no data found`);
                }
            }
            const response = await generateText({
                model: this.model,
                ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: request.prompt,
                            },
                            ...(request.files
                                ? request.files
                                      .filter(file => !!file.uri || !!file.data)
                                      .map(file => ({
                                          type: 'file' as const,
                                          mediaType: file.mimeType,
                                          data: (file.uri ?? file.data)!,
                                      }))
                                : []),
                        ],
                    },
                ],
                maxOutputTokens: this.maxTokens,
                temperature: this.temperature,
                maxRetries: this.maxRetries,
            });
            const promptTokens = response.usage?.inputTokens ?? 0;
            const completionTokens = response.usage?.outputTokens ?? 0;
            const result: AIResponse = {
                model: this.model.modelId,
                content: response.text,
                usage: {
                    promptTokens,
                    completionTokens,
                    totalTokens: promptTokens + completionTokens,
                },
            };
            this.cache.set(cacheKey, result, this.DEFAULT_CACHE_TTL);
            return result;
        } catch (error) {
            this.logger.error('AI text generation failed', toError(error));
            throw new Error(`AI text generation failed: ${toError(error).message}`);
        }
    }

    /**
     * Extract structured data using AI service
     */
    async generateObject<T>(request: SchemaAIRequest<T>): Promise<T> {
        try {
            const cacheKey = AIService.generateCacheKey(request);
            if (request.useStorageCache === true && (await this.cache.has(cacheKey))) {
                this.logger.debug(`Cache hit for request ${cacheKey}`);
                const cacheResponse = (await this.cache.get(cacheKey)) as T;
                if (cacheResponse) {
                    return cacheResponse;
                } else {
                    this.logger.warn(`Cache hit for request ${cacheKey} but no data found`);
                }
            }
            const result = await generateText({
                model: this.model,
                system: request.systemPrompt || 'You are an AI assistant that extracts structured data.',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: request.prompt,
                            },
                            ...(request.files
                                ? request.files
                                      .filter(file => !!file.uri || !!file.data)
                                      .map(file => ({
                                          type: 'file' as const,
                                          mediaType: file.mimeType,
                                          data: (file.uri ?? file.data)!,
                                      }))
                                : []),
                        ],
                    },
                ],
                output: Output.object({ schema: request.schema }),
                maxOutputTokens: this.maxTokens,
                temperature: this.temperature,
                maxRetries: this.maxRetries,
            });
            const generatedObject = result.output as T;
            if (!!generatedObject) {
                this.cache.set(cacheKey, generatedObject, this.DEFAULT_CACHE_TTL);
            }
            return generatedObject;
        } catch (error) {
            this.logger.error('AI object generation failed', error instanceof Error ? error : new Error(String(error)));
            throw new Error(`AI object generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Extract structured data using AI service
     */
    async generateStreamObject<T>(request: SchemaAIRequest<T>): Promise<T> {
        try {
            const cacheKey = AIService.generateCacheKey(request);
            if (request.useStorageCache === true && (await this.cache.has(cacheKey))) {
                this.logger.info(`Cache hit for request ${cacheKey}`);
                const cacheResponse = (await this.cache.get(cacheKey)) as T;
                if (cacheResponse) {
                    return cacheResponse;
                } else {
                    this.logger.warn(`Cache hit for request ${cacheKey} but no data found`);
                }
            }
            const result = streamText({
                model: this.model,
                system: request.systemPrompt || 'You are an AI assistant that extracts structured data.',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: request.prompt,
                            },
                            ...(request.files
                                ? request.files
                                      .filter(file => !!file.uri || !!file.data)
                                      .map(file => ({
                                          type: 'file' as const,
                                          mediaType: file.mimeType,
                                          data: (file.uri ?? file.data)!,
                                      }))
                                : []),
                        ],
                    },
                ],
                output: Output.object({ schema: request.schema }),
                maxOutputTokens: this.maxTokens,
                temperature: this.temperature,
                maxRetries: this.maxRetries,
            });
            let chunkCount = 0;
            let chunkSize = 0;
            // We consume partial structured output updates and log stream volume.
            for await (const partialObject of result.partialOutputStream) {
                chunkSize += JSON.stringify(partialObject).length;
                chunkCount++;
            }
            this.logger.info(`Streamed ${chunkCount} chunks with total size ${chunkSize} bytes for request ${cacheKey}`);
            const finalResult = (await result.output) as T;
            if (!!finalResult) {
                this.cache.set(cacheKey, finalResult, this.DEFAULT_CACHE_TTL);
            }
            return finalResult;
        } catch (error) {
            this.logger.error('AI object generation failed', toError(error));
            throw new Error(`AI object generation failed: ${toError(error).message}`);
        }
    }

    /**
     * Get provider info
     */
    getProviderInfo(): {
        name: string;
        model: string;
        version: string;
    } {
        return {
            name: this.model.provider,
            model: this.model.modelId,
            version: this.model.specificationVersion,
        };
    }
}
