/**
 * Artists API endpoints
 * GET /api/admin/artists - Get all artists
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/middleware/auth-middleware';
import { NextResponse } from 'next/server';

export const GET = requireAdmin(async (): Promise<Response> => {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const artistService = container.getArtistService();

    try {
        logger.info('Admin artists list request received');

        const artists = await artistService.getAllArtists();

        return NextResponse.json({
            status: 'success',
            message: 'Artists retrieved successfully',
            data: artists,
        });
    } catch (error) {
        logger.error('Failed to get artists', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve artists',
            },
            { status: 500 }
        );
    }
});
