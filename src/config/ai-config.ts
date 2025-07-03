/**
 * Configuration management for AI services
 */
import type { AIProvider, AIProviderConfig } from '@/lib/services/ai';

/**
 * AI service configuration
 */
export interface AIConfig {
    provider: AIProvider;
    config: AIProviderConfig;
}

/**
 * Get AI service configuration from environment variables
 */
export function getAIConfig(provider: AIProvider = 'vertex', type: 'default' | 'simple' = 'default'): AIConfig {
    // Base configuration
    const config: AIProviderConfig = {
        apiKey: '',
        model: '',
        provider,
    };

    const modelSuffix = type === 'simple' ? 'SIMPLE_' : '';

    // Provider-specific configuration
    switch (provider) {
        case 'openai':
            config.apiKey = process.env['OPENAI_API_KEY'] || '';
            config.model = process.env[`OPENAI_${modelSuffix}MODEL`] || 'gpt-4.1';
            config.maxTokens = process.env['OPENAI_MAX_TOKENS'] ? parseInt(process.env['OPENAI_MAX_TOKENS']!, 10) : 4000;
            config.temperature = process.env['OPENAI_TEMPERATURE'] ? parseFloat(process.env['OPENAI_TEMPERATURE']!) : 0.7;
            break;

        case 'anthropic':
            config.apiKey = process.env['ANTHROPIC_API_KEY'] || '';
            config.model = process.env[`ANTHROPIC_${modelSuffix}MODEL`] || 'claude-3-opus-20240229';
            break;

        case 'vertex':
        case 'google':
            // use api key json file for other props
            config.model = process.env[`GOOGLE_VERTEX_${modelSuffix}MODEL`] || 'gemini-2.5-flash';
            config.projectId = process.env['GOOGLE_VERTEX_PROJECT_ID'] || '';
            config.clientEmail = process.env['GOOGLE_VERTEX_CLIENT_EMAIL'];
            config.privateKey = process.env['GOOGLE_VERTEX_PRIVATE_KEY']?.replace(/\\n/g, '\n');
            config.privateKeyId = process.env['GOOGLE_VERTEX_PRIVATE_KEY_ID'];
            config.maxTokens = process.env['GOOGLE_VERTEX_MAX_TOKENS'] ? parseInt(process.env['GOOGLE_VERTEX_MAX_TOKENS']!, 10) : 4000;
            config.temperature = process.env['GOOGLE_VERTEX_TEMPERATURE'] ? parseFloat(process.env['GOOGLE_VERTEX_TEMPERATURE']!) : 0.7;
            break;

        case 'groq':
            config.apiKey = process.env['GROQ_API_KEY'] || '';
            config.model = process.env[`GROQ_${modelSuffix}MODEL`] || 'groq-1';
            config.maxTokens = process.env['GROQ_MAX_TOKENS'] ? parseInt(process.env['GROQ_MAX_TOKENS']!, 10) : 4000;
            config.temperature = process.env['GROQ_TEMPERATURE'] ? parseFloat(process.env['GROQ_TEMPERATURE']!) : 0.7;
            break;

        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }

    return {
        provider,
        config,
    };
}

/**
 * Validate AI configuration
 */
export function validateAIConfig(aiConfig: AIConfig): void {
    if (!aiConfig.config.model) {
        throw new Error(`AI service model is required for provider: ${aiConfig.provider}`);
    }

    // Provider-specific validation
    switch (aiConfig.provider) {
        case 'azure':
            if (!aiConfig.config.apiKey) {
                throw new Error(`AI service API key is required for provider: ${aiConfig.provider}`);
            }
            if (!aiConfig.config.baseUrl) {
                throw new Error('Azure OpenAI endpoint is required');
            }
            break;

        case 'openai':
            if (!aiConfig.config.apiKey) {
                throw new Error(`AI service API key is required for provider: ${aiConfig.provider}`);
            }
            break;

        case 'google':
            if (!aiConfig.config.projectId) {
                throw new Error('Google Vertex AI project ID is required');
            }
            break;
    }
}

/**
 * Get current AI configuration status
 */
export function getAIConfigStatus(): {
    provider?: AIProvider;
    model?: string;
    hasApiKey: boolean;
    projectId?: string;
    location?: string;
} {
    try {
        const aiConfig = getAIConfig((process.env['AI_PROVIDER'] as AIProvider) || 'vertex', (process.env['AI_TYPE'] as 'default' | 'simple') || 'default');
        validateAIConfig(aiConfig);

        return {
            provider: aiConfig.provider,
            model: aiConfig.config.model,
            hasApiKey: !!aiConfig.config.apiKey,
        };
    } catch {
        return {
            hasApiKey: false,
        };
    }
}
