import { AIProviderConfig, AIRequest, AIResponse, IAIService, SchemaAIRequest } from '@/lib/services/ai/interfaces';
import type { ILogger } from '@/lib/types/logger';
import { createVertex } from '@ai-sdk/google-vertex/edge';
import { groq } from '@ai-sdk/groq';
import { openai } from '@ai-sdk/openai';
import { LanguageModelV1 } from '@ai-sdk/provider';
import { generateObject, generateText, streamObject } from 'ai';
import { hash } from 'ohash';

export class AIService implements IAIService {
    private readonly maxTokens: number;
    private readonly maxRetries: number = 3; // Default retry count
    private readonly temperature: number;
    private readonly model: LanguageModelV1;
    private readonly cache = new Map<string, unknown>();

    constructor(
        private readonly config: AIProviderConfig,
        private readonly logger: ILogger
    ) {
        switch (config.provider) {
            case 'openai':
                // openai and structured outputs are not well supported yet
                // read here https://ai-sdk.dev/providers/ai-sdk-providers/openai
                // and you have to adapt zod schemas (f.e. .optional() is not supported)
                // you can enabled structured outputs only for reasoning models: gpt-4o, gtp-3o, etc...
                this.model = openai(config.model, {
                    structuredOutputs: config.model?.includes('o3') || config.model?.includes('o4') || config.model?.includes('o1'), // Enable structured outputs for reasoning models
                });
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
                })(config.model, {
                    structuredOutputs: true,
                }); // Initialize Vertex AI model
        }
        this.maxTokens = config.maxTokens || 30000;
        this.temperature = config.temperature || 0.8; // Initialize VertexAI with service account credentials
    }

    /**
     * Generate a deterministic cache key for a given request
     */
    private static generateCacheKey(input: AIRequest): string {
        return hash(input);
    }

    /**
     * Generate text completion using Vertex AI SDK
     */
    async generateCompletion(request: AIRequest): Promise<AIResponse> {
        try {
            const cacheKey = AIService.generateCacheKey(request);
            if (request.useStorageCache === true && this.cache.has(cacheKey)) {
                this.logger.debug(`Cache hit for request ${cacheKey}`);
                return this.cache.get(cacheKey) as AIResponse;
            }
            const response = await generateText({
                model: this.model,
                messages: [
                    ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
                    {
                        role: 'user',
                        content: request.prompt,
                    },
                    ...(request.files
                        ? request.files
                              .filter(file => !!file.uri || !!file.data)
                              .map(file => ({
                                  role: 'data' as const,
                                  content: (file.uri ?? file.data)!,
                              }))
                        : []),
                ],
                maxTokens: this.maxTokens,
                temperature: this.temperature,
                maxRetries: this.maxRetries,
            });
            const result: AIResponse = {
                model: this.model.modelId,
                content: response.text,
                usage: {
                    promptTokens: response.usage?.promptTokens || 0,
                    completionTokens: response.usage?.completionTokens || 0,
                    totalTokens: response.usage?.totalTokens || 0,
                },
            };
            this.cache.set(cacheKey, result);
            return result;
        } catch (error) {
            this.logger.error('AI text generation failed', error instanceof Error ? error : new Error(String(error)));
            throw new Error(`AI text generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Extract structured data using AI service
     */
    async generateObject<T>(request: SchemaAIRequest<T>): Promise<T> {
        try {
            const cacheKey = AIService.generateCacheKey(request);
            if (request.useStorageCache === true && this.cache.has(cacheKey)) {
                this.logger.debug(`Cache hit for request ${cacheKey}`);
                return this.cache.get(cacheKey) as T;
            }
            const result = await generateObject<T>({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: request.systemPrompt || 'You are an AI assistant that extracts structured data.',
                    },
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
                                          mimeType: file.mimeType,
                                          data: (file.uri ?? file.data)!,
                                      }))
                                : []),
                        ],
                    },
                ],
                schema: request.schema,
                maxTokens: this.maxTokens,
                temperature: this.temperature,
                maxRetries: this.maxRetries,
            });
            if (!!result.object) {
                this.cache.set(cacheKey, result.object as T);
            }
            return result.object as T;
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
            if (request.useStorageCache === true && this.cache.has(cacheKey)) {
                this.logger.info(`Cache hit for request ${cacheKey}`);
                return this.cache.get(cacheKey) as T;
            }
            const result = streamObject<T>({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: request.systemPrompt || 'You are an AI assistant that extracts structured data.',
                    },
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
                                          mimeType: file.mimeType,
                                          data: (file.uri ?? file.data)!,
                                      }))
                                : []),
                        ],
                    },
                ],
                schema: request.schema,
                maxTokens: this.maxTokens,
                temperature: this.temperature,
                maxRetries: this.maxRetries,
            });
            //let chunkCount = 0;
            // @TODO handle partial object stream properly
            // currently we just count chunks and return final object
            /*for await (const chunk of result.partialObjectStream) {
                chunkCount++;
            }*/

            const finalResult = (await result.object) as T;
            if (!!finalResult) {
                this.cache.set(cacheKey, finalResult);
            }
            return finalResult;
        } catch (error) {
            this.logger.error('AI object generation failed', error instanceof Error ? error : new Error(String(error)));
            throw new Error(`AI object generation failed: ${error instanceof Error ? error.message : String(error)}`);
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
