/**
 * Admin endpoint for crawling festival websites
 * This endpoint is for admin use only to add new festivals to the system
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/middleware/auth-middleware';
import type { User } from '@/lib/services/auth/interfaces';
import { getFestivalArtists, getFestivalStages } from '@/lib/utils/festival-util';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Request schema for festival crawling
 */
const CrawlFestivalRequestSchema = z.object({
    urls: z.array(z.string().url('Must be a valid URL')).min(1, 'At least one URL is required').max(10, 'Maximum 10 URLs allowed'),
    forcedName: z.string().min(2).max(200).optional(),
    files: z
        .array(
            z.object({
                name: z.string().min(2).max(100),
                type: z.string().min(2).max(100),
                base64: z.string().min(2).max(50000),
            })
        )
        .optional(),
});

/**
 * POST /api/admin/crawl-festival
 * Crawl a festival website and extract lineup data (Admin only)
 */
export const POST = requireAdmin(async (request: NextRequest, user: User): Promise<Response> => {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalService = container.getFestivalService();

    try {
        logger.info('Admin festival crawl request received', { userId: user.id, userEmail: user.email });

        // Parse and validate request body
        const body = await request.json();
        const validatedRequest = CrawlFestivalRequestSchema.parse(body);
        logger.info('Starting festival creation...', {
            urls: validatedRequest.urls,
            urlCount: validatedRequest.urls.length,
            requestedBy: user.id,
        });

        // Save to database if requested and crawl was successful
        try {
            const festival = await festivalService.createFestival({
                urls: validatedRequest.urls,
                name: validatedRequest.forcedName,
                files: validatedRequest.files,
            });
            logger.info('Festival created', {
                festivalId: festival.id,
                festivalName: festival.name,
                savedBy: user.id,
            });

            return NextResponse.json({
                status: 'success',
                message: 'Festival crawled and saved successfully',
                data: {
                    festival: festival,
                    crawlResult: {
                        success: true,
                        artistCount: getFestivalArtists(festival).length,
                        stageCount: getFestivalStages(festival).length,
                        scheduleItemCount: festival.lineup.length,
                    },
                },
            });
        } catch (saveError) {
            logger.error('Failed to create festival', saveError instanceof Error ? saveError : new Error(String(saveError)));

            return NextResponse.json({
                status: 'partial_success',
                message: 'Festival creation failed',
                data: {
                    saveError: saveError instanceof Error ? saveError.message : 'Unknown save error',
                },
            });
        }
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
