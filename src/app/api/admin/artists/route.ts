/**
 * Artists API endpoints
 * GET /api/admin/artists - Get all artists
 */
import { requireAdmin } from '@/lib/api/auth-middleware';
import { DIContainer } from '@/lib/container';
import { User } from '@/services/auth';
import { NextRequest, NextResponse } from 'next/server';

export const GET = requireAdmin(async (request: NextRequest, user: User): Promise<Response> => {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const artistRepo = container.getArtistRepository();

    try {
        logger.info('Admin artists list request received');

        const artists = await artistRepo.getAllArtists();

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
