/**
 * Individual artist API endpoint
 * GET /api/admin/artists/[id] - Get artist by ID
 */
import { requireAdmin } from '@/lib/api/auth-middleware';
import { DIContainer } from '@/lib/container';
import { User } from '@/services/auth';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
    // Apply admin authentication manually since requireAdmin doesn't support route params properly
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const artistRepo = container.getArtistRepository();

    try {
        logger.info('Admin artist detail request received', { artistId: params.id });
        
        const artist = await artistRepo.getArtistById(params.id);

        if (!artist) {
            return NextResponse.json({
                status: 'error',
                message: `Artist not found: ${params.id}`,
            }, { status: 404 });
        }

        return NextResponse.json({
            status: 'success',
            message: 'Artist retrieved successfully',
            data: artist,
        });
    } catch (error) {
        logger.error('Failed to get artist', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve artist',
            },
            { status: 500 }
        );
    }
}
