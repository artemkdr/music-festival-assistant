import type { BraveWebSearchConfig } from '@/lib/services/web-search';
import type { WebSearchProvider } from '@/lib/services/web-search';
import type { WebSearchFactoryConfig } from '@/lib/services/web-search';

export function getWebSearchConfig(): WebSearchFactoryConfig {
    const provider = (process.env['WEB_SEARCH_PROVIDER'] as WebSearchProvider | undefined) || 'brave';

    if (provider !== 'brave') {
        throw new Error(`Unsupported web search provider: ${provider}`);
    }

    const braveConfig: BraveWebSearchConfig = {
        apiKey: process.env['BRAVE_SEARCH_API_KEY'] || '',
        baseUrl: process.env['BRAVE_SEARCH_BASE_URL'] || 'https://api.search.brave.com/res',
        timeoutMs: parseInteger(process.env['WEB_SEARCH_TIMEOUT_MS'], 15000),
        defaultCount: parseInteger(process.env['WEB_SEARCH_DEFAULT_COUNT'], 10),
        defaultCountry: process.env['WEB_SEARCH_DEFAULT_COUNTRY'] || undefined,
        defaultSearchLang: process.env['WEB_SEARCH_DEFAULT_LANGUAGE'] || undefined,
    };

    return {
        provider,
        brave: braveConfig,
    };
}

export function validateWebSearchConfig(config: WebSearchFactoryConfig): void {
    if (config.provider === 'brave') {
        const brave = config.brave;
        if (!brave) {
            throw new Error('Brave web search configuration is required');
        }
        if (!brave.apiKey) {
            throw new Error('BRAVE_SEARCH_API_KEY is required for Brave web search');
        }
        if (!/^https?:\/\/.+/.test(brave.baseUrl)) {
            throw new Error('BRAVE_SEARCH_BASE_URL must be a valid URL');
        }
        if (brave.defaultCount < 1 || brave.defaultCount > 50) {
            throw new Error('WEB_SEARCH_DEFAULT_COUNT must be between 1 and 50');
        }
    }
}

function parseInteger(value: string | undefined, fallback: number): number {
    if (!value) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}
