/**
 * Individual festival API endpoint
 * GET /api/admin/festivals/[id] - Get festival by ID
 * PUT /api/admin/festivals/[id] - Update festival by ID
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/utils/auth-utils';
import { Festival, UpdateFestivalSchema } from '@/lib/schemas';
import { User } from '@/lib/services/auth';
import { generateFestivalId } from '@/lib/utils/id-generator';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

interface RouteParams {
    params: Promise<{ [key: string]: string }>;
}

export const GET = requireAdmin(async (request: NextRequest, user: User, context: RouteParams): Promise<Response> => {
    const { id } = await context.params;
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalService = container.getFestivalService();

    if (!id) {
        return NextResponse.json(
            {
                status: 'error',
                message: 'Missing festival ID in dynamic route parameters',
            },
            { status: 400 }
        );
    }

    try {
        logger.info('Admin festival detail request received', { festivalId: id });

        // search festival in the database or use cached data (parsed but not saved)
        const festival = (await festivalService.getFestivalById(id)) ?? (await festivalService.getCachedData(id));

        if (!festival) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: `Festival not found: ${id}`,
                },
                { status: 404 }
            );
        }

        const acts = festival.lineup;

        // Resolve artist references in acts
        logger.debug('Resolving artist references for festival acts', {
            festivalId: id,
            actsCount: acts.length,
        });

        /*const actsWithArtistDetails = await Promise.all(
            acts.map(async act => {
                // Try to find the artist by name
                const artistMatches = await artistService.searchArtistsByName(act.artistName);

                if (artistMatches.length > 0) {
                    // Use the first exact match or best match
                    const exactMatch = artistMatches.find(artist => artist.name.toLowerCase() === act.artistName.toLowerCase());
                    const bestMatch = exactMatch || artistMatches[0];

                    if (bestMatch) {
                        logger.debug('Found artist match for act', {
                            actArtistName: act.artistName,
                            matchedArtistId: bestMatch.id,
                            matchedArtistName: bestMatch.name,
                            isExactMatch: !!exactMatch,
                        });

                        // Return act with resolved artist data
                        return {
                            ...act,
                            artistId: bestMatch.id,
                            artist: bestMatch,
                        };
                    }
                }

                // No artist found, keep original data but log the issue
                logger.warn('No artist found for act', {
                    actArtistName: act.artistName,
                    festivalId: id,
                });

                return act;
            })
        );*/

        return NextResponse.json({
            status: 'success',
            message: 'Festival retrieved successfully',
            data: festival,
        });
    } catch (error) {
        logger.error('Failed to get festival', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve festival',
            },
            { status: 500 }
        );
    }
});

export const PUT = requireAdmin(async (request: NextRequest, user: User, context: RouteParams): Promise<Response> => {
    const { id } = await context.params;
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalService = container.getFestivalService();

    if (!id) {
        return NextResponse.json(
            {
                status: 'error',
                message: 'Missing festival ID in dynamic route parameters',
            },
            { status: 400 }
        );
    }

    try {
        logger.info('Admin festival update request received', { festivalId: id });

        // Parse and validate request body
        const body = await request.json();
        const validatedData = UpdateFestivalSchema.parse(body);

        // Check if festival exists
        const existingFestival = await festivalService.getFestivalById(id);

        const updatedFestival: Festival = {
            id:
                existingFestival?.id ||
                generateFestivalId({
                    name: validatedData.name || 'unknown-festival',
                    location: validatedData.location || 'unknown-location',
                }),
            name: validatedData.name,
            location: validatedData.location,
            description: validatedData.description,
            website: validatedData.website,
            imageUrl: validatedData.imageUrl,
            lineup: validatedData.lineup,
        };

        await festivalService.saveFestival(updatedFestival);

        return NextResponse.json({
            status: 'success',
            message: 'Festival updated successfully',
            data: {
                id: updatedFestival.id,
            },
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Invalid festival data',
                    errors: error.errors,
                },
                { status: 400 }
            );
        }

        logger.error('Failed to update festival', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to update festival',
            },
            { status: 500 }
        );
    }
});
