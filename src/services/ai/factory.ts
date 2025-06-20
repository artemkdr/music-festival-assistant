/**
 * AI service factory for creating AI providers
 */
import type { ILogger } from '@/lib/logger';
import type { IAIService, IAIServiceFactory, AIProvider, AIProviderConfig } from './interfaces';
import { OpenAIService } from './openai-service';
import { VertexAIService } from './vertex-service';

/**
 * AI service factory implementation
 */
export class AIServiceFactory implements IAIServiceFactory {
    constructor(private readonly logger: ILogger) {}

    /**
     * Create an AI service instance based on provider type
     */
    createAIService(provider: AIProvider, config: AIProviderConfig): IAIService {
        this.logger.info('Creating AI service', { provider, model: config.model });

        switch (provider) {
            case 'openai':
                return new OpenAIService(config, this.logger);

            case 'google':
                return new VertexAIService(config, this.logger);

            case 'anthropic':
                throw new Error('Anthropic provider not yet implemented');

            case 'azure':
                throw new Error('Azure OpenAI provider not yet implemented');

            case 'custom':
                throw new Error('Custom provider not yet implemented');

            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    /**
     * Get list of supported providers
     */
    getSupportedProviders(): AIProvider[] {
        return ['openai', 'google']; // OpenAI and Google Vertex AI are implemented
    }

    /**
     * Validate provider configuration
     */
    validateConfig(provider: AIProvider, config: AIProviderConfig): void {
        if (!config.apiKey) {
            throw new Error(`API key is required for ${provider} provider`);
        }

        if (!config.model) {
            throw new Error(`Model is required for ${provider} provider`);
        }

        switch (provider) {
            case 'openai':
                this.validateOpenAIConfig(config);
                break;
            case 'google':
                this.validateVertexAIConfig(config);
                break;
            // Add other provider validations as they are implemented
        }
    }

    /**
     * Validate OpenAI specific configuration
     */
    private validateOpenAIConfig(config: AIProviderConfig): void {
        const validModels = ['gpt-4', 'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'];

        if (!validModels.includes(config.model)) {
            this.logger.warn('Unknown OpenAI model specified', { model: config.model });
        }

        if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 32000)) {
            throw new Error('maxTokens must be between 1 and 32000');
        }

        if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
            throw new Error('temperature must be between 0 and 2');
        }
    }

    /**
     * Validate Vertex AI specific configuration
     */
    private validateVertexAIConfig(config: AIProviderConfig): void {
        const validModels = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro', 'text-bison', 'chat-bison', 'code-bison'];

        if (!validModels.includes(config.model)) {
            this.logger.warn('Unknown Vertex AI model specified', { model: config.model });
        }

        if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 8192)) {
            throw new Error('maxTokens must be between 1 and 8192 for Vertex AI');
        }

        if (config.temperature && (config.temperature < 0 || config.temperature > 1)) {
            throw new Error('temperature must be between 0 and 1 for Vertex AI');
        }

        // Vertex AI specific validations
        if (!config.projectId && !process.env.VERTEX_PROJECT_ID) {
            throw new Error('projectId is required for Vertex AI (provide in config or set VERTEX_PROJECT_ID env var)');
        }

        if (!config.location && !process.env.VERTEX_LOCATION) {
            this.logger.warn('No location specified for Vertex AI, defaulting to us-central1');
        }
    }
}
