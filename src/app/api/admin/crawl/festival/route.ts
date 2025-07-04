/**
 * Admin endpoint for crawling festival websites
 * This endpoint is for admin use only to add new festivals to the system
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/utils/auth-utils';
import type { User } from '@/lib/services/auth/interfaces';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { toError } from '@/lib/utils/error-handler';

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
 * POST /api/admin/crawl/festival
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

        // Parse festival data without saving - for review/approval
        const { cacheId, festival } = await festivalService.grabFestivalData({
            urls: validatedRequest.urls,
            name: validatedRequest.forcedName,
            files: validatedRequest.files,
        });

        logger.info('Festival parsed successfully', {
            festivalName: festival.name,
            cacheId: cacheId,
            parsedBy: user.id,
        });

        return NextResponse.json({
            status: 'success',
            message: 'Festival parsed successfully - ready for review and approval',
            data: {
                cacheId: cacheId,
                // Redirect to edit page with cache ID
                redirect: new URL(`/admin/festivals/${cacheId}/edit`, request.url),
            },
        });
    } catch (error) {
        logger.error('Admin festival crawl failed', toError(error));

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
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
                message: 'Festival crawl failed',
            },
            { status: 500 }
        );
    }
});
