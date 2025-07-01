/**
 * Cached Festival API endpoint
 * GET /api/admin/festivals/cache/[cacheId] - Get cached festival data by cache ID
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/utils/auth-utils';
import type { User } from '@/lib/services/auth/interfaces';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ [key: string]: string }>;
}

/**
 * GET /api/admin/festivals/cache/[cacheId]
 * Retrieve cached festival data by cache ID (Admin only)
 */
export const GET = requireAdmin(async (request: NextRequest, user: User, context: RouteParams): Promise<Response> => {
    const { cacheId } = await context.params;
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalService = container.getFestivalService();

    if (!cacheId) {
        return NextResponse.json(
            {
                status: 'error',
                message: 'Cache ID is required in dynamic route parameters',
            },
            { status: 400 }
        );
    }

    try {
        logger.info('Admin cached festival request received', {
            userId: user.id,
            userEmail: user.email,
            cacheId,
        });

        const cachedFestival = await festivalService.getCachedData(cacheId);

        if (!cachedFestival) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Cached festival not found or expired',
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            status: 'success',
            message: 'Cached festival retrieved successfully',
            data: {
                cacheId,
                festival: cachedFestival,
            },
        });
    } catch (error) {
        logger.error('Failed to get cached festival', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve cached festival',
            },
            { status: 500 }
        );
    }
});
