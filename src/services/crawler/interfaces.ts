/**
 * Festival web crawler service interfaces
 */
import type { Festival, Artist, Performance } from '@/types';

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
 * Parsed festival lineup data
 */
export interface ParsedLineupData {
    artists: {
        name: string;
        genres?: string[];
        description?: string;
        imageUrl?: string;
        socialLinks?: {
            website?: string;
            instagram?: string;
            twitter?: string;
            facebook?: string;
        };
        streamingLinks?: {
            spotify?: string;
            appleMusic?: string;
            youtube?: string;
            soundcloud?: string;
            bandcamp?: string;
        };
    }[];
    stages?: string[];
    schedule?: {
        artistName: string;
        stage: string;
        startTime: string;
        endTime: string;
        day?: number;
    }[];
}

/**
 * Festival crawling result
 */
export interface FestivalCrawlResult {
    success: boolean;
    festival?: Festival;
    rawData: RawFestivalData;
    parsedData?: ParsedLineupData;
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
    aiEnhanced: boolean; // Whether to use AI for parsing
}

/**
 * Festival crawler service interface
 */
export interface IFestivalCrawlerService {
    /**
     * Crawl festival website and extract lineup data
     * @param url Festival website URL
     * @param festivalInfo Basic festival information (name, location, dates)
     * @returns Promise resolving to crawl result
     */
    crawlFestival(
        url: string,
        festivalInfo: {
            name: string;
            location: string;
            startDate: string;
            endDate: string;
            description?: string;
        }
    ): Promise<FestivalCrawlResult>;

    /**
     * Parse raw HTML content to extract festival data
     * @param html Raw HTML content
     * @param url Source URL for context
     * @returns Promise resolving to parsed lineup data
     */
    parseHtmlContent(html: string, url: string): Promise<ParsedLineupData>;

    /**
     * Validate and clean extracted festival data
     * @param rawData Raw parsed data
     * @returns Promise resolving to cleaned data
     */
    validateAndCleanData(rawData: ParsedLineupData): Promise<ParsedLineupData>;

    /**
     * Convert parsed data to festival format
     * @param parsedData Parsed lineup data
     * @param festivalInfo Basic festival information
     * @returns Promise resolving to festival object
     */
    convertToFestival(
        parsedData: ParsedLineupData,
        festivalInfo: {
            name: string;
            location: string;
            startDate: string;
            endDate: string;
            description?: string;
            website?: string;
        }
    ): Promise<Festival>;

    /**
     * Get crawler configuration
     */
    getConfig(): CrawlerConfig;

    /**
     * Update crawler configuration
     */
    updateConfig(config: Partial<CrawlerConfig>): void;
}
