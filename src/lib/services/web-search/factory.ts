import type { ILogger } from '@/lib/types/logger';
import { BraveWebSearchConfig, BraveWebSearchService } from './brave-web-search-service';
import { IWebSearchService, WebSearchProvider } from './interfaces';

export interface WebSearchFactoryConfig {
    provider: WebSearchProvider;
    brave?: BraveWebSearchConfig | undefined;
}

export class WebSearchFactory {
    constructor(private readonly logger: ILogger) {}

    public create(config: WebSearchFactoryConfig): IWebSearchService {
        switch (config.provider) {
            case 'brave':
                if (!config.brave) {
                    throw new Error('Brave web search config is required');
                }
                this.logger.info('Creating Brave web search service');
                return new BraveWebSearchService(this.logger, config.brave);
            default:
                throw new Error(`Unsupported web search provider: ${config.provider}`);
        }
    }
}
