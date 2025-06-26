import { ILogger } from '@/lib/logger';
import { AIProviderConfig, AIRequest, AIResponse, IAIService, SchemaAIRequest } from '@/services/ai/interfaces';
import { createVertex } from '@ai-sdk/google-vertex';
import { openai } from '@ai-sdk/openai';
import { groq } from '@ai-sdk/groq';
import { LanguageModelV1 } from '@ai-sdk/provider';
import { generateObject, generateText, streamObject } from 'ai';

export class AIService implements IAIService {
    private readonly maxTokens: number;
    private readonly maxRetries: number = 3; // Default retry count
    private readonly temperature: number;
    private readonly model: LanguageModelV1;

    constructor(
        private readonly config: AIProviderConfig,
        private readonly logger: ILogger
    ) {
        switch (config.provider) {
            case 'openai':
                this.model = openai(config.model); // Replace with OpenAI model initialization
                break;
            case 'groq':
                this.model = groq(config.model);
                break;
            default:
                if (!config.projectId) {
                    throw new Error('Project ID is required for Vertex AI');
                }
                this.model = createVertex({
                    project: config.projectId,
                    location: config.location || 'us-central1', // Default to us-central1 if not specified
                })(config.model); // Initialize Vertex AI model
        }
        this.maxTokens = config.maxTokens || 30000;
        this.temperature = config.temperature || 0.8; // Initialize VertexAI with service account credentials
    }

    /**
     * Generate text completion using Vertex AI SDK
     */
    async generateCompletion(request: AIRequest): Promise<AIResponse> {
        try {
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
            return {
                model: this.model.modelId,
                content: response.text,
                usage: {
                    promptTokens: response.usage?.promptTokens || 0,
                    completionTokens: response.usage?.completionTokens || 0,
                    totalTokens: response.usage?.totalTokens || 0,
                },
            };
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
            let chunkCount = 0;
            for await (const chunk of result.partialObjectStream) {
                console.log('chunk received:', chunkCount, chunk);
                chunkCount++;
            }

            return (await result.object) as T;
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
