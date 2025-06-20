/**
 * Configuration management for AI services
 */
import type { AIProvider, AIProviderConfig } from '@/services/ai';

/**
 * AI service configuration
 */
export interface AIConfig {
    enabled: boolean;
    provider: AIProvider;
    config: AIProviderConfig;
}

/**
 * Get AI service configuration from environment variables
 */
export function getAIConfig(): AIConfig {
    const enabled = process.env.AI_ENABLED === 'true';
    const provider = (process.env.AI_PROVIDER as AIProvider) || 'openai';

    // Base configuration
    const config: AIProviderConfig = {
        apiKey: '',
        model: '',
    };

    // Provider-specific configuration
    switch (provider) {
        case 'openai':
            config.apiKey = process.env.OPENAI_API_KEY || '';
            config.model = process.env.OPENAI_MODEL || 'gpt-4.1';
            config.maxTokens = process.env.OPENAI_MAX_TOKENS ? parseInt(process.env.OPENAI_MAX_TOKENS, 10) : 4000;
            config.temperature = process.env.OPENAI_TEMPERATURE ? parseFloat(process.env.OPENAI_TEMPERATURE) : 0.7;
            break;

        case 'anthropic':
            config.apiKey = process.env.ANTHROPIC_API_KEY || '';
            config.model = process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';
            break;

        case 'google':
            config.apiKey = process.env.GOOGLE_API_KEY || '';
            config.model = process.env.GOOGLE_MODEL || 'gemini-pro';
            break;

        case 'azure':
            config.apiKey = process.env.AZURE_OPENAI_API_KEY || '';
            config.model = process.env.AZURE_OPENAI_MODEL || 'gpt-4';
            config.baseUrl = process.env.AZURE_OPENAI_ENDPOINT || '';
            break;

        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }

    return {
        enabled,
        provider,
        config,
    };
}

/**
 * Validate AI configuration
 */
export function validateAIConfig(aiConfig: AIConfig): void {
    if (!aiConfig.enabled) {
        return; // Skip validation if AI is disabled
    }

    if (!aiConfig.config.apiKey) {
        throw new Error(`AI service API key is required for provider: ${aiConfig.provider}`);
    }

    if (!aiConfig.config.model) {
        throw new Error(`AI service model is required for provider: ${aiConfig.provider}`);
    }

    // Provider-specific validation
    switch (aiConfig.provider) {
        case 'azure':
            if (!aiConfig.config.baseUrl) {
                throw new Error('Azure OpenAI endpoint is required');
            }
            break;
    }
}

/**
 * Get current AI configuration status
 */
export function getAIConfigStatus(): {
    enabled: boolean;
    provider?: AIProvider;
    model?: string;
    hasApiKey: boolean;
} {
    try {
        const aiConfig = getAIConfig();
        validateAIConfig(aiConfig);

        return {
            enabled: aiConfig.enabled,
            provider: aiConfig.provider,
            model: aiConfig.config.model,
            hasApiKey: !!aiConfig.config.apiKey,
        };
    } catch {
        return {
            enabled: false,
            hasApiKey: false,
        };
    }
}
