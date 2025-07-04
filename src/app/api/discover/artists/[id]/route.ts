import { DIContainer } from '@/lib/di-container';
import { toError } from '@/lib/utils/error-handler';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ [key: string]: string }>;
}

export const GET = async (request: NextRequest, context: RouteParams): Promise<Response> => {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const artistService = container.getArtistService();
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json(
            {
                message: 'Missing artist ID in dynamic route parameters',
            },
            { status: 400 }
        );
    }

    try {
        logger.info('Artist detail request received', { artistId: id });

        const artist = await artistService.getArtistById(id);

        if (!artist) {
            return NextResponse.json(
                {
                    message: `Artist not found: ${id}`,
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            status: 'success',
            message: 'Artist retrieved successfully',
            data: artist,
        });
    } catch (error) {
        logger.error('Failed to get artist', toError(error));
        return NextResponse.json(
            {
                message: 'Failed to retrieve artist',
            },
            { status: 500 }
        );
    }
};
