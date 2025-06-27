/**
 * AI service exports
 */

// Interfaces
export type {
    IAIService,
    IAIServiceFactory,
    AIProvider,
    AIProviderConfig,
    AIRequest,
    AIResponse,
    SchemaAIRequest as StructuredExtractionRequest,
    ArtistMatchingRequest,
    RecommendationRequest,
} from './interfaces';

// Implementations
export { AIServiceFactory } from './factory';
