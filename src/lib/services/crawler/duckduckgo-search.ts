/**
 * DuckDuckGo search service implementation using Playwright
 * Provides web search functionality with result extraction
 */
import type { ILogger } from '@/lib/types/logger';
import { toError, type IRetryHandler } from '@/lib/utils/error-handler';
import { chromium, type Browser, type Page } from 'playwright';
import type { ISearchService, SearchConfig, SearchResult } from './interfaces';

/**
 * DuckDuckGo search service using Playwright for web scraping
 * Implements ISearchService interface for dependency injection
 */
export class DuckDuckGoSearchService implements ISearchService {
    private readonly config: SearchConfig;
    private browser: Browser | null = null;

    /**
     * Initialize DuckDuckGo search service
     * @param logger Logger instance for structured logging
     * @param retryHandler Retry handler for failed operations
     * @param config Search configuration options
     */
    constructor(
        private readonly logger: ILogger,
        private readonly retryHandler: IRetryHandler,
        config: Partial<SearchConfig> = {}
    ) {
        this.config = {
            timeout: 30000,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            headless: true,
            ...config,
        };

        this.logger.info('DuckDuckGo search service initialized', {
            config: this.config,
        });
    }

    /**
     * Search for a query and return the first result
     * @param query Search query string
     * @returns Promise resolving to the first search result
     * @throws Error if no results found or search fails
     */
    async searchFirst(query: string): Promise<SearchResult> {
        this.logger.info('Searching for first result', { query });

        const results = await this.search(query, 1);

        if (results && results.length > 0 && results[0]) {
            const firstResult = results[0]; // We know it exists due to length check
            this.logger.info('First search result found', {
                query,
                title: firstResult.title,
                url: firstResult.url,
            });

            return firstResult;
        } else {
            throw new Error(`No search results found for query: "${query}"`);
        }
    }

    /**
     * Search for a query and return multiple results
     * @param query Search query string
     * @param limit Maximum number of results to return (default: 10)
     * @returns Promise resolving to array of search results
     */
    async search(query: string, limit: number = 10): Promise<SearchResult[]> {
        if (!query?.trim()) {
            throw new Error('Search query cannot be empty');
        }

        this.logger.info('Starting search operation', {
            query,
            limit,
        });

        return await this.retryHandler.execute(
            () => this.performSearch(query, limit),
            `DuckDuckGo search for "${query}"`,
            (error: Error) => {
                // Retry for network errors, timeouts, but not for structural issues
                const shouldRetry = !error.message.includes('No search results found') && !error.message.includes('Search query cannot be empty');

                if (!shouldRetry) {
                    this.logger.debug('Not retrying due to error type', {
                        query,
                        errorMessage: error.message,
                    });
                }

                return shouldRetry;
            }
        );
    }

    /**
     * Perform the actual search using Playwright
     * @param query Search query string
     * @param limit Maximum number of results to return
     * @returns Promise resolving to array of search results
     */
    private async performSearch(query: string, limit: number): Promise<SearchResult[]> {
        let page: Page | null = null;

        try {
            this.logger.debug('Starting search operation', { query, limit });

            // Initialize browser if not already done
            await this.initializeBrowser();

            if (!this.browser) {
                throw new Error('Failed to initialize browser');
            }

            // Create new page
            page = await this.browser.newPage();
            await page.setExtraHTTPHeaders({
                'User-Agent': this.config.userAgent,
            });

            // Navigate to DuckDuckGo
            this.logger.debug('Navigating to DuckDuckGo');
            await page.goto(`https://duckduckgo.com`, {
                timeout: this.config.timeout,
            });

            // Wait for the search input to be available
            await page.waitForSelector('input[name="q"]', { timeout: this.config.timeout });
            // Perform search
            await page.fill('input[name="q"]', query);
            await page.keyboard.press('Enter');
            // Wait for results to load
            await page.waitForEvent('load');

            const content = await page.content();
            console.log('Page content loaded successfully', {
                url: page.url(),
                contentLength: content.length,
                content: content.slice(0, 1000), // Log first 1000 characters for debugging
            });

            // Extract search results
            const results = await page.evaluate(() => {
                const articles = document.querySelectorAll('article[data-testid="result"]');
                const extractedAt = new Date().toISOString();

                // Extract title, URL, and snippet from each article
                return Array.from(articles)
                    .slice(0, 10) // Limit to 10 results
                    .map(article => {
                        const titleElement = article.querySelector('h2 a');
                        const snippetElement = article.querySelector('[data-result="snippet"]');

                        const title = titleElement?.textContent?.trim() || '';
                        const url = titleElement?.getAttribute('href') || '';
                        const snippet = snippetElement?.textContent?.trim() || '';

                        return {
                            title,
                            url,
                            snippet,
                            extractedAt,
                        };
                    })
                    .filter(result => result.title && result.url);
            });

            this.logger.info('Search completed successfully', {
                query,
                extractedCount: results.length,
            });

            if (results.length === 0) {
                throw new Error(`No search results found for query: "${query}"`);
            }

            return results;
        } catch (error) {
            this.logger.error('Error during search performance', toError(error), {
                searchQuery: query,
            });
            throw error;
        } finally {
            // Close page
            if (page) {
                await page.close().catch(err => this.logger.warn('Failed to close page', { error: err.message }));
            }
        }
    }

    /**
     * Initialize browser instance if not already initialized
     */
    private async initializeBrowser(): Promise<void> {
        if (this.browser) {
            return;
        }

        this.logger.debug('Initializing browser');

        try {
            this.browser = await chromium.launch({
                headless: this.config.headless,
                timeout: this.config.timeout,
            });

            this.logger.info('Browser initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize browser', toError(error));
            throw error;
        }
    }

    /**
     * Close browser and cleanup resources
     */
    async close(): Promise<void> {
        if (this.browser) {
            this.logger.debug('Closing browser');
            await this.browser.close();
            this.browser = null;
            this.logger.info('Browser closed successfully');
        }
    }

    /**
     * Cleanup resources when service is destroyed
     */
    async dispose(): Promise<void> {
        await this.close();
    }
}
