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
            context?: string | undefined;
        }
    ): Promise<Artist>;
}
