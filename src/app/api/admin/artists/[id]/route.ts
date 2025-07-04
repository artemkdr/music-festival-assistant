/**
 * Individual artist API endpoint
 * GET /api/admin/artists/[id] - Get artist by ID
 * PUT /api/admin/artists/[id] - Update artist by ID
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/utils/auth-utils';
import { UpdateArtistSchema } from '@/lib/schemas';
import { Artist } from '@/lib/schemas';
import { User } from '@/lib/services/auth';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { toError } from '@/lib/utils/error-handler';

interface RouteParams {
    params: Promise<{ [key: string]: string }>;
}

export const GET = requireAdmin(async (request: NextRequest, user: User, context: RouteParams): Promise<Response> => {
    // Apply admin authentication manually since requireAdmin doesn't support route params properly
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
        logger.info('Admin artist detail request received', { artistId: id });

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
});

export const PUT = requireAdmin(async (request: NextRequest, user: User, context: RouteParams): Promise<Response> => {
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
        logger.info('Admin artist update request received', { artistId: id });

        // Parse and validate request body
        const body = await request.json();
        const validatedData = UpdateArtistSchema.parse(body);

        // Check if artist exists
        const existingArtist = await artistService.getArtistById(id);
        if (!existingArtist) {
            return NextResponse.json(
                {
                    message: `Artist not found: ${id}`,
                },
                { status: 404 }
            );
        }

        // Update artist with validated data
        const updatedArtist: Artist = {
            ...existingArtist,
            ...validatedData,
            id,
            popularity: {
                ...existingArtist.popularity,
                ...(validatedData.popularity || {}),
            },
        };

        const savedArtist = await artistService.saveArtist(updatedArtist);

        return NextResponse.json({
            status: 'success',
            message: 'Artist updated successfully',
            data: savedArtist,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    message: 'Invalid artist data',
                    errors: error.errors,
                },
                { status: 400 }
            );
        }

        logger.error('Failed to update artist', toError(error));
        return NextResponse.json(
            {
                message: 'Failed to update artist',
            },
            { status: 500 }
        );
    }
});

export const DELETE = requireAdmin(async (request: NextRequest, user: User, context: RouteParams): Promise<Response> => {
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
        logger.info('Admin artist delete request received', { artistId: id });

        // Check if artist exists
        const existingArtist = await artistService.getArtistById(id);
        if (!existingArtist) {
            return NextResponse.json(
                {
                    message: `Artist not found: ${id}`,
                },
                { status: 404 }
            );
        }

        // Delete artist
        await artistService.deleteArtist(id);

        return NextResponse.json({
            status: 'success',
            message: 'Artist deleted successfully',
        });
    } catch (error) {
        logger.error('Failed to delete artist', toError(error));
        return NextResponse.json(
            {
                message: 'Failed to delete artist',
            },
            { status: 500 }
        );
    }
});
