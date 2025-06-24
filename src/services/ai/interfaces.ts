/**
 * AI service abstractions for festival parsing, matching, and recommendations
 */

import { RecommendationShortSchema } from '@/schemas';
import { Artist, Festival, UserPreferences } from '@/types';
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
     * Match and normalize artist names
    
    matchArtist(request: ArtistMatchingRequest): Promise<{
        matchedArtist?: string;
        confidence: number;
        suggestions: string[];
    }>;

    /**
     * Generate personalized recommendations
    
    generateRecommendations(request: RecommendationRequest): Promise<unknown[]>;*/

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
    createAIService(provider: AIProvider, config: AIProviderConfig): IAIService;
    getSupportedProviders(): AIProvider[];
}

/**
 * Musical AI service interface
 */
export interface IMusicalAIService {
    scrapeFestivalLineup(inputs: string[]): Promise<Festival>;
    getArtistDetails(inputs: string[]): Promise<Artist>;
    generateRecommendations({
        userPreferences,
        availableArtists,
    }: {
        userPreferences: UserPreferences;
        availableArtists: {
            name: string;
            genre: string[] | undefined;
            description: string | undefined;
        }[];
    }): Promise<z.infer<typeof RecommendationShortSchema>[]>;
}
