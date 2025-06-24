/**
 * Festivals API endpoints
 * GET /api/admin/festivals - Get all festivals
 */
import { requireAdmin } from '@/middleware/auth-middleware';
import { DIContainer } from '@/lib/di-container';
import { NextResponse } from 'next/server';

export const GET = requireAdmin(async (): Promise<Response> => {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalService = container.getFestivalService();

    try {
        logger.info('Admin festivals list request received');

        const festivals = await festivalService.getAllFestivals();
        return NextResponse.json({
            status: 'success',
            message: 'Festivals retrieved successfully',
            data: festivals,
        });
    } catch (error) {
        logger.error('Failed to get festivals', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve festivals',
            },
            { status: 500 }
        );
    }
});
