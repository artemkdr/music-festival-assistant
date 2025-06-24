/**
 * Individual festival API endpoint
 * GET /api/admin/festivals/[id] - Get festival by ID
 * PUT /api/admin/festivals/[id] - Update festival by ID
 */
import { DIContainer } from '@/lib/container';
import { UpdateFestivalSchema } from '@/schemas';
import { Festival, generateArtistId, generatePerformanceId, Performance } from '@/schemas';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams): Promise<Response> {
    const { id } = await context.params;
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalRepo = container.getFestivalRepository();
    const artistRepo = container.getArtistRepository();

    try {
        logger.info('Admin festival detail request received', { festivalId: id });

        const festival = await festivalRepo.getFestivalById(id);

        if (!festival) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: `Festival not found: ${id}`,
                },
                { status: 404 }
            );
        }

        // Resolve artist references in performances
        logger.debug('Resolving artist references for festival performances', {
            festivalId: id,
            performanceCount: festival.performances.length,
        });

        const enrichedPerformances = await Promise.all(
            festival.performances.map(async performance => {
                // Try to find the artist by name
                const artistMatches = await artistRepo.searchArtistsByName(performance.artist.name);

                if (artistMatches.length > 0) {
                    // Use the first exact match or best match
                    const exactMatch = artistMatches.find(artist => artist.name.toLowerCase() === performance.artist.name.toLowerCase());
                    const bestMatch = exactMatch || artistMatches[0];

                    if (bestMatch) {
                        logger.debug('Found artist match for performance', {
                            performanceArtistName: performance.artist.name,
                            matchedArtistId: bestMatch.id,
                            matchedArtistName: bestMatch.name,
                            isExactMatch: !!exactMatch,
                        });

                        // Return performance with resolved artist data
                        return {
                            ...performance,
                            artistId: bestMatch.id,
                            artist: bestMatch,
                        };
                    }
                }

                // No artist found, keep original data but log the issue
                logger.warn('No artist found for performance', {
                    performanceArtistName: performance.artist.name,
                    festivalId: id,
                });

                return performance;
            })
        );

        const enrichedFestival = {
            ...festival,
            performances: enrichedPerformances,
        };

        // Count how many artists were successfully resolved
        const originalArtistIds = festival.performances.map(p => p.artist.id);
        const resolvedArtistIds = enrichedPerformances.map(p => p.artist.id);
        const newlyResolvedCount = resolvedArtistIds.filter((id, index) => id !== originalArtistIds[index]).length;

        logger.info('Festival retrieved successfully with artist resolution', {
            festivalId: id,
            performanceCount: enrichedFestival.performances.length,
            resolvedArtists: newlyResolvedCount,
        });

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
    const festivalRepo = container.getFestivalRepository();

    try {
        logger.info('Admin festival update request received', { festivalId: id });

        // Parse and validate request body
        const body = await request.json();
        const validatedData = UpdateFestivalSchema.parse(body);

        // Check if festival exists
        const existingFestival = await festivalRepo.getFestivalById(id);
        if (!existingFestival) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: `Festival not found: ${id}`,
                },
                { status: 404 }
            );
        }

        // Update festival with validated data
        const stages = new Set<string>();
        validatedData.performances.forEach(performance => {
            if (performance.stage) {
                stages.add(performance.stage);
            }
        });
        const updatedFestival: Festival = {
            id: existingFestival.id,
            name: validatedData.name || existingFestival.name,
            location: validatedData.location || existingFestival.location,
            startDate: validatedData.startDate || existingFestival.startDate,
            endDate: validatedData.endDate || existingFestival.endDate,
            description: validatedData.description || existingFestival.description,
            website: validatedData.website || existingFestival.website,
            imageUrl: validatedData.imageUrl || existingFestival.imageUrl,
            performances: [] as Performance[],
            stages: Array.from(stages), // Convert Set to Array
        };
        // fill performances with existing data, updating only the fields that are provided
        validatedData.performances.forEach(async performance => {
            // find existings artist by id or name
            let artist = performance.artist.id
                ? await container.getArtistRepository().getArtistById(performance.artist.id)
                : await container.getArtistRepository().searchArtistByName(performance.artist.name);
            // if artist still not found, then we will crawl one
            if (!artist) {
                artist = await container.getArtistCrawlerService().crawlArtistByName(performance.artist.name);
            }
            // if artist still not found, then create a new one
            if (!artist) {
                artist = {
                    id: generateArtistId(),
                    name: performance.artist.name,
                };
            }

            updatedFestival.performances.push({
                id: performance.id || generatePerformanceId(updatedFestival.name),
                artist,
                startTime: performance.startTime,
                endTime: performance.endTime,
                stage: performance.stage,
                day: performance.day || 1,
            });
        });

        const savedFestival = await festivalRepo.saveFestival(updatedFestival);

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
