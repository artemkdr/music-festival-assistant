/**
 * Festival web crawler service implementation
 */
import type { ILogger } from '@/lib/logger';
import { IMusicalAIService } from '@/services/ai/interfaces';
import { type Festival } from '@/schemas';
import type { IFestivalCrawlerService } from './interfaces';

/**
 * Festival crawler service implementation
 */
export class FestivalCrawlerService implements IFestivalCrawlerService {
    constructor(
        private readonly logger: ILogger,
        private readonly aiService?: IMusicalAIService | null
    ) {
        this.logger.info('Festival crawler service initialized');
    }
    /**
     * Crawl festival using a list of URLs (HTML, PDF, etc.) and extract lineup data via AI service
     * @param urls List of URLs to crawl (HTML, PDF, etc.)
     * @param festivalInfo Optional festival metadata
     * @returns FestivalCrawlResult
     */
    async crawlFestival(urls: string[]): Promise<Festival> {
        this.logger.info('Starting festival crawl', {
            urls,
        });

        try {
            // Step 1: Pass URLs to AI service for lineup extraction
            if (!this.aiService) {
                throw new Error('AI service is not configured');
            }
            return this.aiService.generateFestival(urls);
        } catch (error) {
            this.logger.error('Festival crawl failed', error instanceof Error ? error : new Error(String(error)));
            throw new Error(`Festival crawl failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
