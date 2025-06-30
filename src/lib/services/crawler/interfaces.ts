/**
 * Festival web crawler service interfaces
 */
import type { Artist, Festival } from '@/lib/schemas';

/**
 * Raw festival data extracted from web pages
 */
export interface RawFestivalData {
    url: string;
    html: string;
    title?: string;
    description?: string;
    extractedAt: string;
    metadata?: {
        lastModified?: string;
        contentType?: string;
        size?: number;
    };
}

/**
 * Festival crawling result
 */
export interface FestivalCrawlResult {
    success: boolean;
    festival?: Festival;
    rawData: RawFestivalData;
    parsedData?: unknown;
    errors?: string[];
    warnings?: string[];
    aiProcessingTime?: number;
    totalProcessingTime: number;
}

/**
 * Festival crawler configuration
 */
export interface CrawlerConfig {
    timeout: number; // Request timeout in ms
    userAgent: string;
    maxRetries: number;
    retryDelay: number; // Delay between retries in ms
    respectRobotsTxt: boolean;
    parseImages: boolean;
    parseSchedule: boolean;
}

/**
 * Festival crawler service interface
 */
export interface IFestivalCrawlerService {
    /**
     * Crawl festival using a list of URLs (HTML, PDF, etc.) and extract lineup data via AI service
     * @param urls List of URLs to crawl (HTML, PDF, etc.)
     * @param festivalInfo Optional basic festival information
     * @returns Promise resolving to crawl result
     */
    crawlFestival(urls: string[]): Promise<Festival>;
}

export interface IArtistCrawlerService {
    /**
     * Crawl artist data by name: try Spotify first, then enrich with AI if needed.
     * @param name Artist name (assumed unique for this context)
     * @returns Complete Artist object
     */
    crawlArtistByName(
        name: string,
        data?: {
            spotifyId?: string | undefined;
            context?: string | undefined; // Optional context for the artist (e.g., festival name or country or website)
        }
    ): Promise<Artist>;
}

/**
 * Search result from web search
 */
export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    extractedAt: string;
}

/**
 * Search service configuration
 */
export interface SearchConfig {
    timeout: number; // Request timeout in ms
    userAgent: string;
    headless: boolean; // Whether to run browser in headless mode
}

/**
 * Web search service interface
 */
export interface ISearchService {
    /**
     * Search for a query and return the first result
     * @param query Search query string
     * @returns Promise resolving to the first search result
     * @throws Error if no results found or search fails
     */
    searchFirst(query: string): Promise<SearchResult>;

    /**
     * Search for a query and return multiple results
     * @param query Search query string
     * @param limit Maximum number of results to return (default: 10)
     * @returns Promise resolving to array of search results
     */
    search(query: string, limit?: number): Promise<SearchResult[]>;
}
