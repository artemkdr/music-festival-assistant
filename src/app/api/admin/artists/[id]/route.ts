/**
 * Individual artist API endpoint
 * GET /api/admin/artists/[id] - Get artist by ID
 * PUT /api/admin/artists/[id] - Update artist by ID
 */
import { DIContainer } from '@/lib/container';
import { UpdateArtistSchema } from '@/schemas';
import { Artist } from '@/schemas';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

interface RouteParams {
    params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
    // Apply admin authentication manually since requireAdmin doesn't support route params properly
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const artistRepo = container.getArtistRepository();
    const { id } = await params;

    try {
        logger.info('Admin artist detail request received', { artistId: id });

        const artist = await artistRepo.getArtistById(id);

        if (!artist) {
            return NextResponse.json(
                {
                    status: 'error',
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

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<Response> {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const artistRepo = container.getArtistRepository();
    const { id } = await params;

    try {
        logger.info('Admin artist update request received', { artistId: id });

        // Parse and validate request body
        const body = await request.json();
        const validatedData = UpdateArtistSchema.parse(body);

        // Check if artist exists
        const existingArtist = await artistRepo.getArtistById(id);
        if (!existingArtist) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: `Artist not found: ${id}`,
                },
                { status: 404 }
            );
        }

        // Update artist with validated data
        const updatedArtist: Artist = {
            ...existingArtist,
            ...validatedData,
            id: params.id, // Ensure ID doesn't change
            popularity: {
                ...existingArtist.popularity,
                ...(validatedData.popularity || {}),
            },
        };

        const savedArtist = await artistRepo.saveArtist(updatedArtist);

        return NextResponse.json({
            status: 'success',
            message: 'Artist updated successfully',
            data: savedArtist,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Invalid artist data',
                    errors: error.errors,
                },
                { status: 400 }
            );
        }

        logger.error('Failed to update artist', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to update artist',
            },
            { status: 500 }
        );
    }
}
