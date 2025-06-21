/**
 * Festival web crawler service interfaces
 */
import { ParsedFestivalData } from '@/services/ai/schemas';
import type { Festival } from '@/types';

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
    parsedData?: ParsedFestivalData;
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
    crawlFestival(urls: string[]): Promise<FestivalCrawlResult>;

    /**
     * Convert parsed data to festival format
     * @param parsedData Parsed lineup data
     * @param festivalInfo Basic festival information
     * @returns Promise resolving to festival object
     */
    convertToFestival(
        parsedData: ParsedFestivalData,
        festivalInfo: {
            name: string;
            location: string;
            startDate: string;
            endDate: string;
            description?: string;
            website?: string;
        }
    ): Promise<Festival>;
}
