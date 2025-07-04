/**
 * Admin endpoint for linking festival acts with artists
 * Handles both linking to existing artists and creating new artists from Spotify data
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/utils/auth-utils';
import { User } from '@/lib/services/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { toError } from '@/lib/utils/error-handler';

const LinkActRequestSchema = z.object({
    actId: z.string().min(1),
    artistName: z.string(),
    artistId: z.string().optional(), // Required for 'existing' type
    spotifyData: z
        .object({
            id: z.string(),
            name: z.string(),
            spotifyUrl: z.string(),
            genres: z.array(z.string()).optional(),
            popularity: z.number().optional(),
            imageUrl: z.string().optional(), // Optional, can be null
            followers: z.number().optional(),
        })
        .optional(), // Required for 'spotify' type
});

interface RouteParams {
    params: Promise<{ [key: string]: string }>;
}

export const POST = requireAdmin(async (request: NextRequest, user: User, context: RouteParams): Promise<Response> => {
    const id = (await context.params).id;
    const container = DIContainer.getInstance();
    const festivalService = container.getFestivalService();
    const artistService = container.getArtistService();
    const logger = container.getLogger();

    if (!id) {
        return NextResponse.json(
            {
                message: 'Missing festival ID in dynamic route parameters',
            },
            { status: 400 }
        );
    }

    try {
        logger.info('Admin act linking request received');
        const body = await request.json();
        const validated = LinkActRequestSchema.parse(body);

        // Get the festival
        const festival = (await festivalService.getFestivalById(id)) ?? (await festivalService.getCachedData(id));
        if (!festival) {
            return NextResponse.json(
                {
                    message: `Festival not found: ${id}`,
                },
                { status: 404 }
            );
        }

        // Find the act in the festival lineup
        const act = festival.lineup.find(act => act.id === validated.actId);
        if (!act) {
            return NextResponse.json(
                {
                    message: `Act not found: ${validated.actId}`,
                },
                { status: 404 }
            );
        }

        let artistId: string;

        if (validated.artistId) {
            // Verify the artist exists
            const existingArtist = await artistService.getArtistById(validated.artistId);
            if (!existingArtist) {
                return NextResponse.json(
                    {
                        message: `Artist not found: ${validated.artistId}`,
                    },
                    { status: 404 }
                );
            }
            artistId = validated.artistId;
            logger.info(`Linking act ${act.artistName} to existing artist ${existingArtist.name}`);
        } else {
            // Create new artist from Spotify data
            if (!validated.spotifyData) {
                return NextResponse.json(
                    {
                        message: 'spotifyData is required for Spotify artist creation',
                    },
                    { status: 400 }
                );
            }

            logger.info(`Creating new artist from Spotify data: ${validated.spotifyData.name}`);

            // Create artist using the artist service with Spotify data
            const newArtist = await artistService.createArtist({
                name: validated.artistName,
                genre: validated.spotifyData.genres || [],
                imageUrl: validated.spotifyData.imageUrl,
                mappingIds: {
                    spotify: validated.spotifyData.id,
                },
                festivalName: festival.name,
                festivalUrl: festival.website,
            });

            artistId = newArtist.id;
            logger.info(`Created new artist with ID: ${artistId}`);
        }

        // Update the festival act with the artist ID
        await festivalService.updateFestivalAct(id, validated.actId, {
            artistId: artistId,
        });

        return NextResponse.json({
            status: 'success',
            message: 'Act linked successfully',
            data: {
                actId: validated.actId,
                artistId: artistId,
            },
        });
    } catch (error) {
        logger.error('Admin act linking failed', toError(error));
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
                message: 'Act linking failed',
            },
            { status: 500 }
        );
    }
});
