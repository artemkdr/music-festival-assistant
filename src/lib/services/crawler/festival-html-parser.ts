/**
 * @fileoverview Festival html parser class for website data extraction.
 *
 * It uses Playwright for browser automation and AI service for parsing.
 * It uses AI for generating a parser function based on the HTML content.
 * Then this function is evaluated in the browser context (Playwright) to extract structured data.
 *
 * @author github/artemkdr
 */
import { IMusicalAIService } from '@/lib/services/ai/interfaces';
import type { ILogger } from '@/lib/types/logger';
import { IErrorHandler, IRetryHandler, toError } from '@/lib/utils/error-handler';
import { Browser, BrowserContext, chromium, Page } from 'playwright';
import { z } from 'zod';

export interface IFestivalHtmlParser<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
    parse(url: string): Promise<z.infer<TSchema> | null>;
}

export interface ScraperOptions {
    userAgent?: string;
    timeout?: number;
    retryAttempts?: number;
}

interface CachedData<T> {
    data: T;
    createdAt: Date;
    expiresAt: Date;
}

/**
 * Provides robust HTML downloading and parsing with error handling and retry logic.
 */
export class FestivalHtmlParser<TSchema extends z.ZodTypeAny = z.ZodTypeAny> implements IFestivalHtmlParser {
    private readonly defaultOptions: ScraperOptions = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        timeout: 30000,
        retryAttempts: 3,
    };

    private readonly cache: Map<string, CachedData<z.infer<TSchema>>> = new Map();

    private readonly CACHE_TTL_HOURS = 24; // Cache expires after 24 hours

    constructor(
        protected readonly festivalSchema: TSchema,
        protected readonly aiService: IMusicalAIService,
        protected readonly logger: ILogger,
        protected readonly errorHandler: IErrorHandler,
        protected readonly retryHandler: IRetryHandler,
        private readonly options: ScraperOptions = {}
    ) {
        this.options = { ...this.defaultOptions, ...options };

        // Set up periodic cache cleanup every hour
        setInterval(() => this.clearExpiredCache(), 60 * 60 * 1000);
    }

    /**
     * Main scraping method that navigates to URL with browser and parses it.
     * @param url - The URL to scrape
     * @returns Parsed data according to the schema
     */
    async parse(url: string): Promise<z.infer<TSchema> | null> {
        this.logger.info(`Starting scrape operation for URL: ${url}`);

        // Check cache first
        const cachedData = this.getFromCache(url);
        if (cachedData) {
            this.logger.debug(`Cache hit for URL: ${url}`);
            return cachedData;
        }

        let browser: Browser | null = null;
        let context: BrowserContext | null = null;
        let page: Page | null = null;

        try {
            browser = await chromium.launch();
            context = await browser.newContext({
                userAgent: this.options.userAgent || 'scraper/1.0',
            });
            page = await this.scrapeWithBrowser(url, browser, context);
            const result = await this.parseHtml(page, url);
            this.logger.info(`Successfully scraped data from: ${url}`);
            if (result) {
                // Add to cache
                this.addToCache(url, result);
                this.logger.debug(`Data cached for URL: ${url}`);
            }
            return result;
        } catch (error) {
            this.logger.error(`Scraping failed for URL: ${url}`, error as Error);
            this.errorHandler.handleAPIError(error, 'BaseScraper', 'scrape');
        } finally {
            // Clean up resources
            await page?.close();
            await context?.close();
            await browser?.close();
        }

        return null;
    }

    /**
     * Scrapes a URL using Playwright browser automation.
     * @param url - The URL to scrape
     * @returns Parsed data according to the schema
     */
    async scrapeWithBrowser(url: string, browser: Browser, context: BrowserContext): Promise<Page> {
        this.logger.debug(`Launching browser for URL: ${url}`);
        const page = await context.newPage();
        // Navigate to the URL
        this.logger.debug(`Navigating to URL: ${url}`);
        await page.goto(url);
        // cleanup
        await this.cleanPage(page);
        this.logger.debug(`Page loaded, rendered and cleaned up successfully: ${url}`);
        return page;
    }

    /**
     * Parses HTML content using Playwright page and validates against schema.
     * @param page - Playwright page instance
     * @param url - Original URL (for context in error messages)
     * @returns Parsed and validated data
     */
    async parseHtml(page: Page, url: string): Promise<z.infer<TSchema>> {
        this.logger.debug(`Parsing HTML for URL: ${url}`);

        let parsedData: unknown = {};
        let parserFunctionCode: string;

        try {
            this.logger.debug(`Using AI service to parse HTML for URL: ${url}`);
            let htmlContent = await page.content();
            // find/replace cleanup
            htmlContent = htmlContent
                .replace(/\s+/g, ' ') // remove spaces
                .replace(/<!--[\s\S]*?-->/g, '') // remove HTML comments
                .trim();
            parserFunctionCode = await this.aiService.generateFestivalParserFunction(htmlContent, url);
        } catch (error) {
            throw new Error(`AI parser function generation failed for URL: ${url}`, toError(error));
        }

        try {
            parsedData = await this.evaluateScript<z.infer<TSchema>>(page, parserFunctionCode);
        } catch (error) {
            this.logger.error(`Failed to evaluate parser function for URL: ${url}`, toError(error));
            throw new Error('Failed to evaluate parser function', toError(error));
        }

        // validate parsed data against Festival schema
        try {
            this.festivalSchema.parse(parsedData);
        } catch (error) {
            this.logger.error(`Parsed data validation failed for URL: ${url}`, toError(error));
            throw new Error(`Parsed data validation failed for URL: ${url}`, toError(error));
        }

        this.logger.debug(`Successfully parsed and validated data for: ${url}`);

        // convert validatedDat to Festival type
        return parsedData as z.infer<TSchema>;
    }

    /**
     * Cleans the HTML content by removing unnecessary elements.
     * @returns Cleaned HTML content
     */
    protected async cleanPage(page: Page): Promise<void> {
        this.logger.debug(`Cleaning HTML content`);
        const evaluationScript = () => {
            const elementsToRemove = [
                'script',
                'style',
                'noscript',
                'iframe',
                'svg',
                'img',
                'audio',
                'video',
                'canvas',
                'map',
                'source',
                'dialog',
                'menu',
                'menuitem',
                'track',
                'object',
                'embed',
                'form',
                'input',
                'button',
                'select',
                'textarea',
                'label',
                'option',
                'optgroup',
                'aside',
                'footer',
                'header',
                'nav',
                'head',
            ];

            const attributesToRemove = ['style', 'src', 'alt', 'title', 'role', 'aria-', 'tabindex', 'on', 'data-'];

            const elementTree = document.querySelectorAll('*');

            elementTree.forEach(element => {
                if (elementsToRemove.includes(element.tagName.toLowerCase())) {
                    element.remove();
                }
                Array.from(element.attributes).forEach(attr => {
                    if (attributesToRemove.some(a => attr.name.startsWith(a))) {
                        element.removeAttribute(attr.name);
                    }
                });
            });

            // remove empty nodes
            const emptyNodes = document.querySelectorAll('*');
            emptyNodes.forEach(node => {
                if (node.textContent?.trim() === '') {
                    node.remove();
                }
            });
        };
        await page.evaluate(evaluationScript);
    }

    /**
     * Helper method to evaluate JavaScript on the page.
     * @param page - Playwright page instance
     * @param script - JavaScript code to evaluate
     * @param defaultValue - Default value if evaluation fails
     * @returns Result of JavaScript evaluation
     */
    protected async evaluateScript<TResult = unknown>(page: Page, script: string, defaultValue?: TResult): Promise<TResult | undefined> {
        try {
            return (await page.evaluate(script)) as TResult;
        } catch (error) {
            this.logger.error(`Failed to evaluate script:`, toError(error));
            return defaultValue;
        }
    }

    // Cache management methods
    /**
     * Adds a page and parser function to the cache.
     * @param url - The URL to cache
     * @param page - The Playwright page instance
     * @param parserFunction - The parser function code to cache
     */
    addToCache(url: string, data: z.infer<TSchema>): void {
        this.logger.debug(`Adding to cache: ${url}`);
        this.cache.set(url, {
            data,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.CACHE_TTL_HOURS * 60 * 60 * 1000), // Set expiration time
        });
    }

    /**
     * Retrieves a cached page and parser function by URL.
     * @param url - The URL to retrieve from cache
     * @returns Cached page and parser function or null if not found
     */
    getFromCache(url: string): z.infer<TSchema> {
        this.logger.debug(`Retrieving from cache: ${url}`);
        const cached = this.cache.get(url);
        if (cached) {
            // Check if cache has expired
            if (new Date() > cached.expiresAt) {
                this.logger.debug(`Cache expired for URL: ${url}`);
                this.cache.delete(url);
                return null;
            }
            this.logger.debug(`Cache hit for URL: ${url}`);
            return cached.data;
        }
        this.logger.debug(`Cache miss for URL: ${url}`);
        return null;
    }

    /**
     * Clears the cache.
     */
    clearCache(): void {
        this.logger.debug(`Clearing cache`);
        this.cache.clear();
    }

    /**
     * Clears expired cache entries.
     */
    clearExpiredCache(): void {
        this.logger.debug(`Clearing expired cache entries`);
        const now = new Date();
        let expiredCount = 0;

        for (const [url, cachedData] of this.cache.entries()) {
            if (now > cachedData.expiresAt) {
                this.cache.delete(url);
                expiredCount++;
            }
        }

        if (expiredCount > 0) {
            this.logger.info(`Cleared ${expiredCount} expired cache entries`);
        } else {
            this.logger.debug(`No expired cache entries found`);
        }
    }
}
