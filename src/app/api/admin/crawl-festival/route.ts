/**
 * Admin endpoint for crawling festival websites
 * This endpoint is for admin use only to add new festivals to the system
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DIContainer } from '@/lib/container';

/**
 * Request schema for festival crawling
 */
const CrawlFestivalRequestSchema = z.object({
    url: z.string().url('Must be a valid URL'),
    options: z
        .object({
            aiEnhanced: z.boolean().default(true),
            parseImages: z.boolean().default(true),
            parseSchedule: z.boolean().default(true),
            saveToDB: z.boolean().default(false), // Whether to save the result to the festivals repository
        })
        .optional()
        .default({}),
});

//type CrawlFestivalRequest = z.infer<typeof CrawlFestivalRequestSchema>;

/**
 * POST /api/admin/crawl-festival
 * Crawl a festival website and extract lineup data
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const crawlerService = container.getFestivalCrawlerService();
    const festivalRepository = container.getFestivalRepository();

    try {
        logger.info('Admin festival crawl request received');

        // Parse and validate request body
        const body = await request.json();
        const validatedRequest = CrawlFestivalRequestSchema.parse(body);
        logger.info('Starting festival crawl', {
            url: validatedRequest.url,
            options: validatedRequest.options,
        });

        // Update crawler config if needed
        if (validatedRequest.options) {
            const currentConfig = crawlerService.getConfig();
            crawlerService.updateConfig({
                ...currentConfig,
                aiEnhanced: validatedRequest.options.aiEnhanced,
                parseImages: validatedRequest.options.parseImages,
                parseSchedule: validatedRequest.options.parseSchedule,
            });
        }

        const crawlResult = await crawlerService.crawlFestival(validatedRequest.url);

        // Save to database if requested and crawl was successful
        if (validatedRequest.options.saveToDB && crawlResult.success && crawlResult.festival) {
            try {
                const savedFestival = await festivalRepository.saveFestival(crawlResult.festival);
                logger.info('Festival saved to repository', {
                    festivalId: savedFestival.id,
                    festivalName: savedFestival.name,
                });

                return NextResponse.json({
                    status: 'success',
                    message: 'Festival crawled and saved successfully',
                    data: {
                        festival: savedFestival,
                        crawlResult: {
                            success: crawlResult.success,
                            artistCount: crawlResult.parsedData?.artists.length || 0,
                            stageCount: crawlResult.parsedData?.stages?.length || 0,
                            scheduleItemCount: crawlResult.parsedData?.schedule?.length || 0,
                            totalProcessingTime: crawlResult.totalProcessingTime,
                            aiProcessingTime: crawlResult.aiProcessingTime,
                            warnings: crawlResult.warnings,
                        },
                    },
                });
            } catch (saveError) {
                logger.error('Failed to save festival to repository', saveError instanceof Error ? saveError : new Error(String(saveError)));

                return NextResponse.json({
                    status: 'partial_success',
                    message: 'Festival crawled successfully but failed to save to database',
                    data: {
                        crawlResult,
                        saveError: saveError instanceof Error ? saveError.message : 'Unknown save error',
                    },
                });
            }
        }

        // Return crawl result without saving
        return NextResponse.json({
            status: crawlResult.success ? 'success' : 'error',
            message: crawlResult.success ? 'Festival crawled successfully' : 'Festival crawl failed',
            data: {
                crawlResult,
            },
        });
    } catch (error) {
        logger.error('Admin festival crawl failed', error instanceof Error ? error : new Error(String(error)));

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Invalid request data',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Festival crawl failed',
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/crawl-festival
 * Get crawler service status and configuration
 */
export async function GET(): Promise<NextResponse> {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const crawlerService = container.getFestivalCrawlerService();

    try {
        const config = crawlerService.getConfig();

        return NextResponse.json({
            status: 'success',
            message: 'Crawler service status',
            data: {
                config,
                endpoints: {
                    crawl: 'POST /api/admin/crawl-festival',
                },
                exampleRequest: {
                    url: 'https://example-festival.com',
                    festivalInfo: {
                        name: 'Example Festival 2024', // Optional - will be extracted if not provided
                        location: 'Austin, Texas', // Optional - will be extracted if not provided
                        startDate: '2024-06-15T00:00:00Z', // Optional - will be extracted if not provided
                        endDate: '2024-06-17T23:59:59Z', // Optional - will be extracted if not provided
                        description: 'A great music festival', // Optional - will be extracted if not provided
                    },
                    options: {
                        aiEnhanced: true,
                        parseImages: true,
                        parseSchedule: true,
                        saveToDB: false,
                    },
                },
            },
        });
    } catch (error) {
        logger.error('Failed to get crawler status', error instanceof Error ? error : new Error(String(error)));

        return NextResponse.json(
            {
                status: 'error',
                message: 'Failed to get crawler status',
            },
            { status: 500 }
        );
    }
}
