/**
 * Admin endpoint for crawling festival websites
 * This endpoint is for admin use only to add new festivals to the system
 */
import { DIContainer } from '@/lib/container';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Request schema for festival crawling
 */
const CrawlFestivalRequestSchema = z.object({
    url: z.string().url('Must be a valid URL'),
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
        });

        const crawlResult = await crawlerService.crawlFestival([validatedRequest.url]);

        // Save to database if requested and crawl was successful
        if (crawlResult.success && crawlResult.festival) {
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
