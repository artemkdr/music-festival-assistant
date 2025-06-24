/**
 * Admin endpoint for crawling festival websites
 * This endpoint is for admin use only to add new festivals to the system
 */
import { DIContainer } from '@/lib/container';
import { requireAdmin } from '@/middleware/auth-middleware';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { User } from '@/services/auth/interfaces';
import { generateFestivalId } from '@/schemas';

/**
 * Request schema for festival crawling
 */
const CrawlFestivalRequestSchema = z.object({
    urls: z.array(z.string().url('Must be a valid URL')).min(1, 'At least one URL is required').max(10, 'Maximum 10 URLs allowed'),
});

/**
 * POST /api/admin/crawl-festival
 * Crawl a festival website and extract lineup data (Admin only)
 */
export const POST = requireAdmin(async (request: NextRequest, user: User): Promise<Response> => {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const crawlerService = container.getFestivalCrawlerService();
    const festivalRepository = container.getFestivalRepository();

    try {
        logger.info('Admin festival crawl request received', { userId: user.id, userEmail: user.email });

        // Parse and validate request body
        const body = await request.json();
        const validatedRequest = CrawlFestivalRequestSchema.parse(body);
        logger.info('Starting festival crawl', {
            urls: validatedRequest.urls,
            urlCount: validatedRequest.urls.length,
            requestedBy: user.id,
        });

        const festival = await crawlerService.crawlFestival(validatedRequest.urls);

        // Save to database if requested and crawl was successful
        if (!!festival) {
            try {
                // generate a unique festival ID based on metadata
                festival.id = generateFestivalId({
                    name: festival.name,
                    startDate: festival.startDate,
                    endDate: festival.endDate,
                    location: festival.location,
                });
                const savedFestival = await festivalRepository.saveFestival(festival);
                logger.info('Festival saved to repository', {
                    festivalId: savedFestival.id,
                    festivalName: savedFestival.name,
                    savedBy: user.id,
                });

                return NextResponse.json({
                    status: 'success',
                    message: 'Festival crawled and saved successfully',
                    data: {
                        festival: savedFestival,
                        crawlResult: {
                            success: true,
                            artistCount: festival.performances.reduce((acc, p) => acc + (p.artist ? 1 : 0), 0),
                            stageCount: festival.stages.length,
                            scheduleItemCount: festival.performances.length,
                        },
                    },
                });
            } catch (saveError) {
                logger.error('Failed to save festival to repository', saveError instanceof Error ? saveError : new Error(String(saveError)));

                return NextResponse.json({
                    status: 'partial_success',
                    message: 'Festival crawled successfully but failed to save to database',
                    data: {
                        saveError: saveError instanceof Error ? saveError.message : 'Unknown save error',
                    },
                });
            }
        }

        // Return crawl result without saving
        return NextResponse.json({
            status: !!festival ? 'success' : 'error',
            message: !!festival ? 'Festival crawled successfully' : 'Festival crawl failed',
            data: {
                festival,
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
});
