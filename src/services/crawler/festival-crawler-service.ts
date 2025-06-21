/**
 * Festival web crawler service implementation
 */
import type { ILogger } from '@/lib/logger';
import type { IAIService } from '@/services/ai';
import { ParsedFestivalData, ParsedFestivalDataSchema } from '@/services/ai/schemas';
import type { Artist, Festival, Performance } from '@/types';
import { FestivalDataCleaner } from './festival-data-cleaner';
import type { CrawlerConfig, FestivalCrawlResult, IFestivalCrawlerService } from './interfaces';

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
};

/**
 * Festival crawler service implementation
 */
export class FestivalCrawlerService implements IFestivalCrawlerService {
    private config: CrawlerConfig;
    private dataCleaner: FestivalDataCleaner;

    constructor(
        private readonly logger: ILogger,
        private readonly aiService?: IAIService | null
    ) {
        this.config = { ...DEFAULT_CONFIG };
        this.dataCleaner = new FestivalDataCleaner(this.logger);
        this.logger.info('Festival crawler service initialized', {
            aiEnabled: !!this.aiService,
            config: this.config,
        });
    }
    /**
     * Crawl festival using a list of URLs (HTML, PDF, etc.) and extract lineup data via AI service
     * @param urls List of URLs to crawl (HTML, PDF, etc.)
     * @param festivalInfo Optional festival metadata
     * @returns FestivalCrawlResult
     */
    async crawlFestival(urls: string[]): Promise<FestivalCrawlResult> {
        const startTime = Date.now();
        this.logger.info('Starting festival crawl', {
            urls,
        });

        try {
            // Step 1: Pass URLs to AI service for lineup extraction
            if (!this.aiService) {
                throw new Error('AI service is not configured');
            }
            const aiProcessingStart = Date.now();
            // Use parseFestivalData with files prop (Vertex/AIService standard)
            const parsedData = await this.aiService.parseFestivalData<ParsedFestivalData>({
                files: urls.map(url => ({ uri: url, mimeType: 'application/octet-stream' })),
                content: '', // No direct content
                schema: ParsedFestivalDataSchema,
            });
            const aiProcessingTime = Date.now() - aiProcessingStart;

            // Step 2: Validate and clean data
            const cleanedData = await this.dataCleaner.validateAndCleanData(parsedData);

            // Step 3: Convert to festival format
            const website = urls[0] ?? '';
            const festival = await this.convertToFestival(cleanedData);

            const totalProcessingTime = Date.now() - startTime;
            this.logger.info('Festival crawl completed successfully', {
                urls,
                festivalName: festival.name,
                artistCount: cleanedData.artists.length,
                stageCount: cleanedData.stages?.length || 0,
                scheduleItemCount: cleanedData.schedule?.length || 0,
                totalProcessingTime,
                aiProcessingTime,
            });

            return {
                success: true,
                festival,
                parsedData: cleanedData,
                aiProcessingTime,
                totalProcessingTime,
                warnings: [],
                rawData: {
                    url: website,
                    html: '',
                    extractedAt: new Date().toISOString(),
                },
            };
        } catch (error) {
            const totalProcessingTime = Date.now() - startTime;
            this.logger.error('Festival crawl failed', error instanceof Error ? error : new Error(String(error)));

            // Return partial result with error information
            return {
                success: false,
                errors: [error instanceof Error ? error.message : 'Unknown crawling error'],
                totalProcessingTime,
                rawData: {
                    url: urls[0] ?? '',
                    html: '',
                    extractedAt: new Date().toISOString(),
                },
            };
        }
    }

    /**
     * Convert parsed data to festival format
     */
    async convertToFestival(parsedData: ParsedFestivalData): Promise<Festival> {
        this.logger.debug('Converting parsed data to festival format');
        const festivalId = `festival-${Date.now()}`;
        // Create artists with IDs
        const artists: Artist[] = parsedData.artists.map((artistData: ParsedFestivalData['artists'][number], index: number) => ({
            id: `artist-${festivalId}-${index + 1}`,
            name: artistData.name,
            genre: artistData.genre || ['Unknown'],
            description: artistData.description || `${artistData.name} performing at ${parsedData.name}`,
            ...(artistData.imageUrl && { imageUrl: artistData.imageUrl }),
            ...(artistData.streamingLinks && { streamingLinks: artistData.streamingLinks }),
            ...(artistData.socialLinks && { socialLinks: artistData.socialLinks }),
            popularity: 50, // Default popularity, could be enhanced with AI
        }));

        // Create performances array
        const performances: Performance[] = [];

        if (parsedData.schedule && parsedData.schedule.length > 0) {
            // Use provided schedule
            type ScheduleItem = { artistName: string; stage: string; startTime: string; endTime: string; day?: number | undefined };
            const schedule: ScheduleItem[] = Array.isArray(parsedData.schedule) ? parsedData.schedule : [];
            schedule.forEach((scheduleItem: ScheduleItem, index: number) => {
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
            artists.forEach((artist: Artist, index: number) => {
                const day = Math.floor(index / 10) + 1; // Distribute across days
                const hour = 14 + (index % 8); // Distribute across hours

                const startDate = new Date(parsedData.startDate);
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
            name: parsedData.name,
            description: parsedData.description || `${parsedData.name} - Music Festival`,
            location: parsedData.location,
            startDate: parsedData.startDate,
            endDate: parsedData.endDate,
            ...(parsedData.website && { website: parsedData.website }),
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
}
