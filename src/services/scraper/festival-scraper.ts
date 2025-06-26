/**
 * @fileoverview Base scraper class for website data extraction.
 * @author github/artemkdr
 */
import { ILogger } from '@/lib/logger';
import { Festival } from '@/schemas';
import { IMusicalAIService } from '@/services/ai/interfaces';
import { APIError, IErrorHandler, IRetryHandler } from '@/utils/error-handler';
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { z } from 'zod';

export interface IFestivalScraper {
    scrape(url: string): Promise<Festival>;
}

export interface ScraperOptions {
    userAgent?: string;
    timeout?: number;
    retryAttempts?: number;
}

/**
 * Base scraper class that can be extended for specific website scrapers.
 * Provides robust HTML downloading and parsing with error handling and retry logic.
 */
export class FestivalScraper implements IFestivalScraper {
    private readonly defaultOptions: ScraperOptions = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        timeout: 30000,
        retryAttempts: 3,
    };

    constructor(
        protected readonly aiService: IMusicalAIService,
        protected readonly logger: ILogger,
        protected readonly errorHandler: IErrorHandler,
        protected readonly retryHandler: IRetryHandler,
        private readonly options: ScraperOptions = {}
    ) {
        this.options = { ...this.defaultOptions, ...options };
    }

    /**
     * Main scraping method that navigates to URL with browser and parses it.
     * @param url - The URL to scrape
     * @returns Parsed data according to the schema
     */
    async scrape(url: string): Promise<Festival> {
        this.logger.info(`Starting scrape operation for URL: ${url}`);
        try {
            const result = await this.scrapeWithBrowser(url);
            this.logger.info(`Successfully scraped data from: ${url}`);
            return result;
        } catch (error) {
            this.logger.error(`Scraping failed for URL: ${url}`, error as Error);
            this.errorHandler.handleAPIError(error, 'BaseScraper', 'scrape');
        }
    }

    /**
     * Scrapes a URL using Playwright browser automation.
     * @param url - The URL to scrape
     * @returns Parsed data according to the schema
     */
    async scrapeWithBrowser(url: string): Promise<Festival> {
        let browser: Browser | null = null;
        let context: BrowserContext | null = null;
        let page: Page | null = null;

        try {
            this.logger.debug(`Launching browser for URL: ${url}`);

            browser = await chromium.launch();

            context = await browser.newContext({
                userAgent: this.options.userAgent || 'scraper/1.0',
            });

            page = await context.newPage();

            // Navigate to the URL
            this.logger.debug(`Navigating to URL: ${url}`);
            await page.goto(url);
            // cleanup
            this.cleanHtml(page);
            // Parse the page
            const result = await this.parseHtml(page, url);
            return result;
        } finally {
            // Clean up resources
            if (page) await page.close();
            if (context) await context.close();
            if (browser) await browser.close();
        }
    }

    /**
     * Parses HTML content using Playwright page and validates against schema.
     * @param page - Playwright page instance
     * @param url - Original URL (for context in error messages)
     * @returns Parsed and validated data
     */
    async parseHtml(page: Page, url: string): Promise<Festival> {
        try {
            this.logger.debug(`Parsing HTML for URL: ${url}`);

            let parsedData: unknown = {};

            try {
                this.logger.debug(`Using AI service to parse HTML for URL: ${url}`);
                let htmlContent = await page.content();
                // final cleanup
                htmlContent = htmlContent
                    .replace(/\s+/g, ' ') // remove spaces
                    .replace(/<!--[\s\S]*?-->/g, '') // remove HTML comments
                    .trim();
                const parserFunction = await this.aiService.generateFestivalParserFunction(htmlContent, url);
                parsedData = await this.evaluateScript(page, parserFunction);
            } catch (error) {
                throw new Error('AI parsing failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
            }

            this.logger.debug(`Successfully parsed and validated data for: ${url}`);

            // convert validatedDat to Festival type
            return parsedData as Festival;
        } catch (error) {
            if (error instanceof z.ZodError) {
                this.logger.error(`Schema validation failed for ${url}: ${error.message}`);
                throw new APIError(`Data validation failed: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`, 400, 'BaseScraper');
            }

            this.logger.error(`HTML parsing failed for ${url}:`, error as Error);
            throw new APIError(`Failed to parse HTML: ${error instanceof Error ? error.message : 'Unknown parsing error'}`, 500, 'BaseScraper', error instanceof Error ? error : undefined);
        }
    }

    /**
     * Cleans the HTML content by removing unnecessary elements.
     * @returns Cleaned HTML content
     */
    protected async cleanHtml(page: Page): Promise<void> {
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
            this.logger.warn(`Failed to evaluate script:`, error as Error);
            return defaultValue;
        }
    }
}
