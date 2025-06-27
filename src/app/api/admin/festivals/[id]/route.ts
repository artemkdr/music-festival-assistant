/**
 * Individual festival API endpoint
 * GET /api/admin/festivals/[id] - Get festival by ID
 * PUT /api/admin/festivals/[id] - Update festival by ID
 */
import { DIContainer } from '@/lib/di-container';
import { Festival, UpdateFestivalSchema } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams): Promise<Response> {
    const { id } = await context.params;
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const artistService = container.getArtistService();
    const festivalService = container.getFestivalService();

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

        const actsWithArtistDetails = await Promise.all(
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
        );

        const enrichedFestival = {
            ...festival,
            lineup: actsWithArtistDetails,
        };

        return NextResponse.json({
            status: 'success',
            message: 'Festival retrieved successfully',
            data: enrichedFestival,
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
}

export async function PUT(request: NextRequest, context: RouteParams): Promise<Response> {
    const { id } = await context.params;
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalService = container.getFestivalService();

    try {
        logger.info('Admin festival update request received', { festivalId: id });

        // Parse and validate request body
        const body = await request.json();
        const validatedData = UpdateFestivalSchema.parse(body);

        // Check if festival exists
        const existingFestival = await festivalService.getFestivalById(id);
        if (!existingFestival) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: `Festival not found: ${id}`,
                },
                { status: 404 }
            );
        }

        const updatedFestival: Festival = {
            id: existingFestival.id,
            name: validatedData.name || existingFestival.name,
            location: validatedData.location || existingFestival.location,
            description: validatedData.description || existingFestival.description,
            website: validatedData.website || existingFestival.website,
            imageUrl: validatedData.imageUrl || existingFestival.imageUrl,
            lineup: validatedData.lineup,
        };

        const savedFestival = await festivalService.saveFestival(updatedFestival);

        return NextResponse.json({
            status: 'success',
            message: 'Festival updated successfully',
            data: savedFestival,
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
}
