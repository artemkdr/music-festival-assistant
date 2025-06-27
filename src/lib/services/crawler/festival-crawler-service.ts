/**
 * Festival web crawler service implementation
 */
import type { ILogger } from '@/lib/types/logger';
import { IErrorHandler, IRetryHandler, toError } from '@/lib/utils/error-handler';
import { IMusicalAIService } from '@/lib/services/ai/interfaces';
import { type Festival } from '@/lib/schemas';
import type { IFestivalCrawlerService } from './interfaces';
import { FestivalScraper, IFestivalScraper } from '@/lib/services/scraper/festival-scraper';

/**
 * Festival crawler service implementation
 */
export class FestivalCrawlerService implements IFestivalCrawlerService {
    private readonly scraper: IFestivalScraper;

    constructor(
        private readonly logger: ILogger,
        errorHandler: IErrorHandler,
        retryHandler: IRetryHandler,
        private readonly aiService: IMusicalAIService
    ) {
        this.scraper = new FestivalScraper(aiService, logger, errorHandler, retryHandler);
    }

    /**
     * Crawl festival using a list of URLs (HTML, PDF, etc.) and extract lineup data via structured scraping or AI service
     * @param urls List of URLs to crawl (HTML, PDF, etc.)
     * @param festivalInfo Optional festival metadata
     * @returns Festival data
     */
    async crawlFestival(urls: string[]): Promise<Festival> {
        this.logger.info('Starting festival crawl', { urls });

        try {
            // Step 1: Try structured scraping first for supported websites
            const scrapedResult = await this.tryStructuredScraping(urls[0]!);

            if (scrapedResult) {
                this.logger.info(`Successfully scraped festival data from: ${urls[0]}`);
                return scrapedResult;
            }

            // Step 2: Fall back to AI service for unsupported websites or when scraping fails
            this.logger.info('No structured scrapers available, falling back to AI service');

            if (!this.aiService) {
                throw new Error('No structured scrapers available and AI service is not configured');
            }

            return await this.aiService.generateFestival(urls);
        } catch (error) {
            this.logger.error('Festival crawl failed', toError(error));
            throw new Error(`Festival crawl failed: ${toError(error).message}`);
        }
    }

    /**
     * Attempts to scrape URLs using appropriate structured scrapers
     * @param urls URLs to scrape
     * @returns Array of successfully scraped festival data
     */
    private async tryStructuredScraping(url: string): Promise<Festival | null> {
        try {
            // Scrape using appropriate scraper
            const scrapedData = await this.scraper.scrape(url);
            return scrapedData;
        } catch (error) {
            this.logger.error(`Structured scraping failed for URL ${url}, will try AI fallback:`, toError(error));
            // Continue to next URL or fall back to AI
        }
        return null;
    }
}
