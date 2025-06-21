/**
 * AI service exports
 */

// Interfaces
export type { IAIService, IAIServiceFactory, AIProvider, AIProviderConfig, AIRequest, AIResponse, StructuredExtractionRequest, ArtistMatchingRequest, RecommendationRequest } from './interfaces';

// Implementations
export { OpenAIService } from './openai-service';
export { AIServiceFactory } from './factory';
