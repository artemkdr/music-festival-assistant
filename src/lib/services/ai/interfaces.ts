/**
 * AI service abstractions for festival parsing, matching, and recommendations
 */

import { RecommendationShortSchema } from '@/lib/schemas';
import { Artist, Festival, UserPreferences } from '@/lib/schemas';
import { ICacheService } from '@/lib/services/cache/interfaces';
import { z, ZodSchema } from 'zod';

/**
 * Configuration for AI provider
 */
export interface AIProviderConfig {
    provider: AIProvider;
    apiKey: string;
    model: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
    // Vertex AI specific properties
    projectId?: string;
    location?: string; // e.g., 'us-central1'
    clientEmail?: string | undefined; // For Google Vertex AI
    privateKey?: string | undefined; // For Google Vertex AI
    privateKeyId?: string | undefined; // For Google Vertex AI
}

/**
 * File input for AI requests
 */
export interface AIFileInput {
    data?: string; // Base64 encoded file data or file path
    mimeType: string; // MIME type of the file (e.g., 'image/jpeg', 'application/pdf')
    name?: string; // Optional file name for reference
    uri?: string; // Optional URI for remote files
}

/**
 * AI service request types
 */
export interface AIRequest {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number; // Optional, for controlling diversity
    topK?: number; // Optional, for controlling diversity
    files?: AIFileInput[]; // Optional file inputs for multimodal AI
    useStorageCache?: boolean; // Use local/remote cache for responses
}

/**
 * AI service response
 */
export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    finishReason?: 'stop' | 'length' | 'content_filter' | 'function_call';
}

/**
 * Structured data extraction request
 */
export interface SchemaAIRequest<T> extends AIRequest {
    schema: ZodSchema; // Zod schema or other validation schema
    content?: string; // Raw text, HTML, or JSON data to extract from
    examples?: T[];
}

/**
 * Artist matching request
 */
export interface ArtistMatchingRequest extends AIRequest {
    artistName: string;
    contextData?: string;
    existingArtists?: string[];
}

/**
 * Recommendation generation request
 */
export interface RecommendationRequest extends AIRequest {
    userPreferences: unknown;
    availableArtists: unknown[];
    userHistory?: unknown[];
}

/**
 * Core AI service interface
 */
export interface IAIService {
    /**
     * Generate text completion
     */
    generateCompletion(request: AIRequest): Promise<AIResponse>;

    /**
     * Extract structured data using AI
     */
    generateObject<T>(request: SchemaAIRequest<T>): Promise<T>;

    /**
     * Extract structured data using AI as a stream
     */
    generateStreamObject<T>(request: SchemaAIRequest<T>): Promise<T>;

    /**
     * Get provider information
     */
    getProviderInfo(): {
        name: string;
        model: string;
        version: string;
    };
}

/**
 * AI provider types
 */
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'vertex' | 'azure' | 'groq' | 'custom';

/**
 * AI service factory interface
 */
export interface IAIServiceFactory {
    createAIService(provider: AIProvider, cacheService: ICacheService, config: AIProviderConfig): IAIService;
    getSupportedProviders(): AIProvider[];
}

/**
 * Musical AI service interface
 */
export interface IMusicalAIService {
    generateFestival(inputs: string[]): Promise<Festival>;
    generateArtist(inputs: string[]): Promise<Artist>;
    generateRecommendations({
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
    }): Promise<z.infer<typeof RecommendationShortSchema>[]>;
    generateFestivalParserFunction(html: string, url: string): Promise<string>;
}
