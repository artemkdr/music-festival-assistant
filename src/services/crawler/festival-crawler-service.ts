/**
 * Festival web crawler service implementation
 */
import type { ILogger } from '@/lib/logger';
import type { IAIService } from '@/services/ai';
import type { Festival, Artist, Performance } from '@/types';
import type {
    IFestivalCrawlerService,
    RawFestivalData,
    ParsedLineupData,
    FestivalCrawlResult,
    CrawlerConfig,
} from './interfaces';

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
    }

    /**
     * Crawl festival website and extract lineup data
     */
    async crawlFestival(
        url: string,
        festivalInfo: {
            name: string;
            location: string;
            startDate: string;
            endDate: string;
            description?: string;
        }
    ): Promise<FestivalCrawlResult> {
        const startTime = Date.now();
        this.logger.info('Starting festival crawl', { url, festivalName: festivalInfo.name });

        try {
            // Step 1: Fetch HTML content
            const rawData = await this.fetchHtmlContent(url);

            // Step 2: Parse HTML content
            const aiProcessingStart = Date.now();
            const parsedData = await this.parseHtmlContent(rawData.html, url);
            const aiProcessingTime = Date.now() - aiProcessingStart;

            // Step 3: Validate and clean data
            const cleanedData = await this.validateAndCleanData(parsedData);

            // Step 4: Convert to festival format
            const festival = await this.convertToFestival(cleanedData, {
                ...festivalInfo,
                website: url,
            });

            const totalProcessingTime = Date.now() - startTime;

            this.logger.info('Festival crawl completed successfully', {
                url,
                festivalName: festivalInfo.name,
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
                });                const lastModified = response.headers.get('last-modified');
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
    }

    /**
     * Extract page title from HTML
     */
    private extractTitle(html: string): string | undefined {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return titleMatch ? titleMatch[1]?.trim() : undefined;
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
            const parsedData = await this.aiService.parseFestivalData({
                prompt: `Parse this festival website HTML and extract lineup information. Focus on artist names, performance schedule, and stage information.`,
                festivalData: html,
                expectedFormat: 'lineup',
                systemPrompt: `You are an expert at parsing music festival websites. Extract structured data from HTML content and return it as JSON.
                
                Return data in this format:
                {
                  "artists": [
                    {
                      "name": "Artist Name",
                      "genres": ["Genre1", "Genre2"],
                      "description": "Artist description if available",
                      "imageUrl": "Image URL if found",
                      "socialLinks": {"website": "url", "instagram": "url", etc},
                      "streamingLinks": {"spotify": "url", "appleMusic": "url", etc}
                    }
                  ],
                  "stages": ["Stage Name 1", "Stage Name 2"],
                  "schedule": [
                    {
                      "artistName": "Artist Name",
                      "stage": "Stage Name",
                      "startTime": "2024-07-20T20:00:00Z",
                      "endTime": "2024-07-20T21:30:00Z",
                      "day": 1
                    }
                  ]
                }
                
                Be thorough but conservative - only include data you're confident about.`,
            });

            if (typeof parsedData === 'object' && parsedData && 'artists' in parsedData) {
                return parsedData as ParsedLineupData;
            }

            // If AI parsing fails, fall back to basic parsing
            this.logger.warn('AI parsing returned unexpected format, falling back to basic parsing');
            return this.parseHtmlBasic(html);
        } catch (error) {
            this.logger.error('AI parsing failed, falling back to basic parsing', 
                error instanceof Error ? error : new Error(String(error)));
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
        const artistPatterns = [
            /<h[1-6][^>]*>([^<]+)</gi,
            /<li[^>]*>([^<]+)</gi,
            /<div[^>]*class="[^"]*artist[^"]*"[^>]*>([^<]+)</gi,
        ];

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
                            genres: ['Unknown'], // Will be enhanced by AI if available
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
                genres: artist.genres || ['Unknown'],
            }))
            .filter((artist, index, array) => 
                // Remove duplicates
                array.findIndex(a => a.name.toLowerCase() === artist.name.toLowerCase()) === index
            );

        // Clean stages
        const cleanedStages = [...new Set(rawData.stages?.filter(stage => stage && stage.trim()) || [])];

        // Clean schedule
        const cleanedSchedule = rawData.schedule?.filter(item => 
            item.artistName && 
            item.stage && 
            item.startTime && 
            item.endTime
        ) || [];

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
            genre: artistData.genres || ['Unknown'],
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
                const artist = artists.find(a => 
                    a.name.toLowerCase() === scheduleItem.artistName.toLowerCase()
                );
                
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
        }        const festival: Festival = {
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
