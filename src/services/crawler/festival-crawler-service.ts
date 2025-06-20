/**
 * Festival web crawler service implementation
 */
import type { ILogger } from '@/lib/logger';
import type { IAIService } from '@/services/ai';
import type { Festival, Artist, Performance } from '@/types';
import type { IFestivalCrawlerService, RawFestivalData, FestivalCrawlResult, CrawlerConfig } from './interfaces';
import { FestivalInfoSchema, ParsedLineupData, ParsedLineupDataSchema, type FestivalInfo } from '@/services/ai/schemas';
import { z } from 'zod';

/**
 * Default crawler configuration
 */
const DEFAULT_CONFIG: CrawlerConfig = {
    timeout: 30000, // 30 seconds
    userAgent: 'Mozilla/5.0 (compatible; MusicFestivalBot/1.0)',
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    respectRobotsTxt: false, // For demo purposes
    parseImages: true,
    parseSchedule: true,
    aiEnhanced: true,
};

/**
 * Festival crawler service implementation
 */
export class FestivalCrawlerService implements IFestivalCrawlerService {
    private config: CrawlerConfig;

    constructor(
        private readonly logger: ILogger,
        private readonly aiService?: IAIService | null
    ) {
        this.config = { ...DEFAULT_CONFIG };
        this.logger.info('Festival crawler service initialized', {
            aiEnabled: !!this.aiService,
            config: this.config,
        });
    } /**
     * Crawl festival website and extract lineup data
     */
    async crawlFestival(url: string, festivalInfo?: FestivalInfo): Promise<FestivalCrawlResult> {
        const startTime = Date.now();
        this.logger.info('Starting festival crawl', {
            url,
            festivalName: festivalInfo?.name || 'Unknown Festival',
        });

        try {
            // Step 1: Fetch HTML content
            const rawData = await this.fetchHtmlContent(url);

            // Step 2: Extract festival metadata from HTML if not provided
            const extractedFestivalInfo = await this.extractFestivalInfo(rawData.html, url);
            const finalFestivalInfo = {
                name: festivalInfo?.name || extractedFestivalInfo.name || 'Unknown Festival',
                location: festivalInfo?.location || extractedFestivalInfo.location || 'Unknown Location',
                startDate: festivalInfo?.startDate || extractedFestivalInfo.startDate || new Date().toISOString(),
                endDate: festivalInfo?.endDate || extractedFestivalInfo.endDate || new Date(Date.now() + 86400000 * 3).toISOString(), // Default to 3 days
                description: festivalInfo?.description || extractedFestivalInfo.description,
            };

            // Step 3: Parse HTML content for lineup
            const aiProcessingStart = Date.now();
            const parsedData = await this.parseHtmlContent(rawData.html, url);
            const aiProcessingTime = Date.now() - aiProcessingStart;

            // Step 4: Validate and clean data
            const cleanedData = await this.validateAndCleanData(parsedData); // Step 5: Convert to festival format
            const festival = await this.convertToFestival(cleanedData, {
                name: finalFestivalInfo.name,
                location: finalFestivalInfo.location,
                startDate: finalFestivalInfo.startDate,
                endDate: finalFestivalInfo.endDate,
                ...(finalFestivalInfo.description && { description: finalFestivalInfo.description }),
                website: url,
            });

            const totalProcessingTime = Date.now() - startTime;
            this.logger.info('Festival crawl completed successfully', {
                url,
                festivalName: finalFestivalInfo.name,
                artistCount: cleanedData.artists.length,
                stageCount: cleanedData.stages?.length || 0,
                scheduleItemCount: cleanedData.schedule?.length || 0,
                totalProcessingTime,
                aiProcessingTime,
            });

            return {
                success: true,
                festival,
                rawData,
                parsedData: cleanedData,
                aiProcessingTime,
                totalProcessingTime,
                warnings: [],
            };
        } catch (error) {
            const totalProcessingTime = Date.now() - startTime;
            this.logger.error('Festival crawl failed', error instanceof Error ? error : new Error(String(error)));

            // Return partial result with error information
            return {
                success: false,
                rawData: {
                    url,
                    html: '',
                    extractedAt: new Date().toISOString(),
                },
                errors: [error instanceof Error ? error.message : 'Unknown crawling error'],
                totalProcessingTime,
            };
        }
    }

    /**
     * Fetch HTML content from URL
     */
    private async fetchHtmlContent(url: string): Promise<RawFestivalData> {
        this.logger.debug('Fetching HTML content', { url });

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': this.config.userAgent,
                        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate',
                        Connection: 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                    },
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const html = await response.text();
                const contentType = response.headers.get('content-type') || 'text/html';

                this.logger.debug('HTML content fetched successfully', {
                    url,
                    size: html.length,
                    contentType,
                    attempt,
                });
                const lastModified = response.headers.get('last-modified');
                const title = this.extractTitle(html);
                return {
                    url,
                    html,
                    ...(title && { title }),
                    extractedAt: new Date().toISOString(),
                    metadata: {
                        ...(lastModified && { lastModified }),
                        contentType,
                        size: html.length,
                    },
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                this.logger.warn(`Fetch attempt ${attempt} failed`, {
                    url,
                    attempt,
                    error: lastError.message,
                });

                if (attempt < this.config.maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                }
            }
        }

        throw new Error(`Failed to fetch content after ${this.config.maxRetries} attempts: ${lastError?.message}`);
    } /**
     * Extract page title from HTML
     */
    private extractTitle(html: string): string | undefined {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return titleMatch ? titleMatch[1]?.trim() : undefined;
    }

    /**
     * Extract festival information from HTML
     */
    private async extractFestivalInfo(html: string, url: string): Promise<FestivalInfo> {
        this.logger.debug('Extracting festival info from HTML', { url });

        if (!this.aiService || !this.config.aiEnhanced) {
            // Fallback to basic extraction without AI
            return this.extractFestivalInfoBasic(html);
        }

        try {
            // Use AI to extract festival metadata
            const extractedInfo = await this.aiService.extractStructuredData({
                prompt: `Extract festival information from this HTML. Focus on festival name, location, dates, and description.

HTML Content: ${html.substring(0, 10000)}`, // Limit content size
                schema: FestivalInfoSchema, // We'll accept any object structure
            });

            if (typeof extractedInfo === 'object' && extractedInfo) {
                return extractedInfo as FestivalInfo;
            }

            // If AI extraction fails, fall back to basic extraction
            this.logger.warn('AI festival info extraction returned unexpected format, falling back to basic extraction');
            return this.extractFestivalInfoBasic(html);
        } catch (error) {
            this.logger.error('AI festival info extraction failed, falling back to basic extraction', error instanceof Error ? error : new Error(String(error)));
            return this.extractFestivalInfoBasic(html);
        }
    }

    /**
     * Basic festival info extraction without AI (fallback)
     */
    private extractFestivalInfoBasic(html: string): z.infer<typeof FestivalInfoSchema> {
        this.logger.debug('Using basic festival info extraction');

        const result: z.infer<typeof FestivalInfoSchema> = {
            name: 'Unknown Festival',
            location: 'Unknown Location',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 86400000 * 3).toISOString(), // Default to 3 days
            description: '',
        };

        // Extract title as potential festival name
        const title = this.extractTitle(html);
        if (title) {
            result.name = title.replace(/\s*-\s*.*$/, '').trim(); // Remove subtitle after dash
        }

        // Look for date patterns
        const datePatterns = [
            /(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*,?\s*(\d{4})/gi,
            /(\w+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})\s*,?\s*(\d{4})/gi,
            /(\d{4})\s*[-–]\s*(\d{2})\s*[-–]\s*(\d{2})/g,
        ];

        for (const pattern of datePatterns) {
            const match = pattern.exec(html);
            if (match) {
                // Try to construct dates from the match
                try {
                    const year = match[4] || match[1];
                    if (year && year.length === 4) {
                        // This is a simplified approach - real implementation would be more sophisticated
                        result.startDate = `${year}-07-01T00:00:00Z`; // Default to July
                        result.endDate = `${year}-07-03T23:59:59Z`;
                        break;
                    }
                } catch {
                    // Continue to next pattern
                }
            }
        }

        // Look for location patterns
        const locationPatterns = [
            /<[^>]*>\s*([^<]*(?:park|arena|venue|center|centre|field|grounds)[^<]*)\s*</gi,
            /<[^>]*>\s*([^<]*,\s*[A-Z]{2}[^<]*)\s*</gi, // US state pattern
            /<[^>]*>\s*([^<]*,\s*[A-Za-z\s]+)\s*</gi, // General location pattern
        ];

        for (const pattern of locationPatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const location = match[1]?.trim();
                if (location && location.length > 5 && location.length < 100) {
                    result.location = location;
                    break;
                }
            }
            if (result.location) break;
        } // Look for description in meta tags
        const metaDescMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
        if (metaDescMatch && metaDescMatch[1]) {
            result.description = metaDescMatch[1].trim();
        }

        this.logger.debug('Basic festival info extraction completed', result);
        return result;
    }

    /**
     * Parse raw HTML content to extract festival data
     */
    async parseHtmlContent(html: string, url: string): Promise<ParsedLineupData> {
        this.logger.debug('Parsing HTML content', { url, htmlSize: html.length });

        if (!this.aiService || !this.config.aiEnhanced) {
            // Fallback to basic parsing without AI
            return this.parseHtmlBasic(html);
        }

        try {
            // Use AI to parse the HTML content
            const parsedData = await this.aiService.parseFestivalData<ParsedLineupData>({
                // create scheam from interface
                schema: ParsedLineupDataSchema,
                festivalData: html,
                expectedFormat: 'lineup',
                prompt: `Parse this festival website HTML and extract lineup information. Focus on artist names, performance schedule, and stage information.`,
            });

            if (typeof parsedData === 'object' && parsedData && 'artists' in parsedData) {
                return parsedData as ParsedLineupData;
            }

            // If AI parsing fails, fall back to basic parsing
            this.logger.warn('AI parsing returned unexpected format, falling back to basic parsing');
            return this.parseHtmlBasic(html);
        } catch (error) {
            this.logger.error('AI parsing failed, falling back to basic parsing', error instanceof Error ? error : new Error(String(error)));
            return this.parseHtmlBasic(html);
        }
    }

    /**
     * Basic HTML parsing without AI (fallback)
     */
    private parseHtmlBasic(html: string): ParsedLineupData {
        this.logger.debug('Using basic HTML parsing');

        const artists: ParsedLineupData['artists'] = [];
        const stages: string[] = [];

        // Very basic pattern matching for common festival website structures
        // This is a simplified implementation - real-world parsing would be more sophisticated

        // Extract potential artist names from headings and lists
        const artistPatterns = [/<h[1-6][^>]*>([^<]+)</gi, /<li[^>]*>([^<]+)</gi, /<div[^>]*class="[^"]*artist[^"]*"[^>]*>([^<]+)</gi];

        const foundNames = new Set<string>();

        for (const pattern of artistPatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const name = match[1]?.trim();
                if (name && name.length > 2 && name.length < 100 && !foundNames.has(name)) {
                    // Filter out obvious non-artist content
                    if (!this.isLikelyNotArtist(name)) {
                        foundNames.add(name);
                        artists.push({
                            name,
                            genre: ['Unknown'], // Will be enhanced by AI if available
                        });
                    }
                }
            }
        }

        this.logger.debug('Basic parsing completed', {
            artistCount: artists.length,
            stageCount: stages.length,
        });

        return {
            artists: artists.slice(0, 50), // Limit to reasonable number
            stages,
            schedule: [], // Schedule parsing requires more sophisticated logic
        };
    }

    /**
     * Check if a string is likely not an artist name
     */
    private isLikelyNotArtist(text: string): boolean {
        const excludePatterns = [
            /^\d+$/,
            /^(home|about|contact|tickets|lineup|schedule|stages?|info|news|gallery|sponsors?)$/i,
            /^(buy tickets|get tickets|book now|more info)$/i,
            /^(main stage|second stage|tent|arena)$/i,
            /^(festival|music|event|concert)$/i,
            /^\s*$/,
        ];

        return excludePatterns.some(pattern => pattern.test(text));
    }

    /**
     * Validate and clean extracted festival data
     */
    async validateAndCleanData(rawData: ParsedLineupData): Promise<ParsedLineupData> {
        this.logger.debug('Validating and cleaning parsed data', {
            artistCount: rawData.artists.length,
            stageCount: rawData.stages?.length || 0,
        });

        // Clean and validate artists
        const cleanedArtists = rawData.artists
            .filter(artist => artist.name && artist.name.trim().length > 0)
            .map(artist => ({
                ...artist,
                name: artist.name.trim(),
                genres: artist.genre || ['Unknown'],
            }))
            .filter(
                (artist, index, array) =>
                    // Remove duplicates
                    array.findIndex(a => a.name.toLowerCase() === artist.name.toLowerCase()) === index
            );

        // Clean stages
        const cleanedStages = [...new Set(rawData.stages?.filter(stage => stage && stage.trim()) || [])];

        // Clean schedule
        const cleanedSchedule = rawData.schedule?.filter(item => item.artistName) || [];

        return {
            artists: cleanedArtists,
            stages: cleanedStages,
            schedule: cleanedSchedule,
        };
    }

    /**
     * Convert parsed data to festival format
     */
    async convertToFestival(
        parsedData: ParsedLineupData,
        festivalInfo: {
            name: string;
            location: string;
            startDate: string;
            endDate: string;
            description?: string;
            website?: string;
        }
    ): Promise<Festival> {
        this.logger.debug('Converting parsed data to festival format');

        const festivalId = `festival-${Date.now()}`;
        // Create artists with IDs
        const artists: Artist[] = parsedData.artists.map((artistData, index) => ({
            id: `artist-${festivalId}-${index + 1}`,
            name: artistData.name,
            genre: artistData.genre || ['Unknown'],
            description: artistData.description || `${artistData.name} performing at ${festivalInfo.name}`,
            ...(artistData.imageUrl && { imageUrl: artistData.imageUrl }),
            ...(artistData.streamingLinks && { streamingLinks: artistData.streamingLinks }),
            ...(artistData.socialLinks && { socialLinks: artistData.socialLinks }),
            popularity: 50, // Default popularity, could be enhanced with AI
        }));

        // Create performances
        const performances: Performance[] = [];

        if (parsedData.schedule && parsedData.schedule.length > 0) {
            // Use provided schedule
            parsedData.schedule.forEach((scheduleItem, index) => {
                const artist = artists.find(a => a.name.toLowerCase() === scheduleItem.artistName.toLowerCase());

                if (artist) {
                    performances.push({
                        id: `perf-${festivalId}-${index + 1}`,
                        artistId: artist.id,
                        artist,
                        startTime: scheduleItem.startTime,
                        endTime: scheduleItem.endTime,
                        stage: scheduleItem.stage,
                        day: scheduleItem.day || 1,
                    });
                }
            });
        } else {
            // Generate basic performance data if no schedule found
            artists.forEach((artist, index) => {
                const day = Math.floor(index / 10) + 1; // Distribute across days
                const hour = 14 + (index % 8); // Distribute across hours

                const startDate = new Date(festivalInfo.startDate);
                startDate.setDate(startDate.getDate() + day - 1);
                startDate.setHours(hour, 0, 0, 0);

                const endDate = new Date(startDate);
                endDate.setHours(hour + 1, 30, 0, 0);

                performances.push({
                    id: `perf-${festivalId}-${index + 1}`,
                    artistId: artist.id,
                    artist,
                    startTime: startDate.toISOString(),
                    endTime: endDate.toISOString(),
                    stage: parsedData.stages?.[index % (parsedData.stages.length || 1)] || 'Main Stage',
                    day,
                });
            });
        }
        const festival: Festival = {
            id: festivalId,
            name: festivalInfo.name,
            description: festivalInfo.description || `${festivalInfo.name} - Music Festival`,
            location: festivalInfo.location,
            startDate: festivalInfo.startDate,
            endDate: festivalInfo.endDate,
            ...(festivalInfo.website && { website: festivalInfo.website }),
            stages: parsedData.stages || ['Main Stage'],
            performances,
        };

        this.logger.info('Festival data conversion completed', {
            festivalId,
            artistCount: artists.length,
            performanceCount: performances.length,
            stageCount: festival.stages.length,
        });

        return festival;
    }

    /**
     * Get crawler configuration
     */
    getConfig(): CrawlerConfig {
        return { ...this.config };
    }

    /**
     * Update crawler configuration
     */
    updateConfig(config: Partial<CrawlerConfig>): void {
        this.config = { ...this.config, ...config };
        this.logger.info('Crawler configuration updated', this.config);
    }
}
