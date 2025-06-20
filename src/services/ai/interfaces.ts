/**
 * AI service abstractions for festival parsing, matching, and recommendations
 */

/**
 * Configuration for AI provider
 */
export interface AIProviderConfig {
    apiKey: string;
    model: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
}

/**
 * AI service request types
 */
export interface AIRequest {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
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
export interface StructuredExtractionRequest<T> extends AIRequest {
    schema: unknown; // Zod schema or other validation schema
    examples?: T[];
}

/**
 * Festival parsing specific requests
 */
export interface FestivalParsingRequest extends AIRequest {
    festivalData: string; // Raw HTML, JSON, or text data
    expectedFormat: 'lineup' | 'schedule' | 'artist_info' | 'venue_info';
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
    extractStructuredData<T>(request: StructuredExtractionRequest<T>): Promise<T>;

    /**
     * Parse festival data from various sources
     */
    parseFestivalData(request: FestivalParsingRequest): Promise<unknown>;

    /**
     * Match and normalize artist names
     */
    matchArtist(request: ArtistMatchingRequest): Promise<{
        matchedArtist?: string;
        confidence: number;
        suggestions: string[];
    }>;

    /**
     * Generate personalized recommendations
     */
    generateRecommendations(request: RecommendationRequest): Promise<unknown[]>;

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
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'azure' | 'custom';

/**
 * AI service factory interface
 */
export interface IAIServiceFactory {
    createAIService(provider: AIProvider, config: AIProviderConfig): IAIService;
    getSupportedProviders(): AIProvider[];
}
