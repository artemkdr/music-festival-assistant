/**
 * Admin endpoint for crawling artist data
 * Accepts a festivalId or a list of artist names, crawls missing artists, and saves them to the repository.
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/utils/auth-utils';
import { Festival } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { toError } from '@/lib/utils/error-handler';

const CrawlArtistsRequestSchema = z.object({
    festivalId: z.string().optional(),
    artistNames: z.array(z.string()).optional(),
    force: z.boolean().optional().default(false), // Optional force flag to re-crawl existing artists
});

export const POST = requireAdmin(async (request: NextRequest): Promise<Response> => {
    const container = DIContainer.getInstance();
    const artistService = container.getArtistService();
    const festivalService = container.getFestivalService();
    const logger = container.getLogger();

    try {
        logger.info('Admin artist crawl request received');
        const body = await request.json();
        const validated = CrawlArtistsRequestSchema.parse(body);

        let artistNames: string[] = [];
        let festival: Festival | null = null;
        if (validated.festivalId) {
            festival = await festivalService.getFestivalById(validated.festivalId);
            if (!festival) {
                return NextResponse.json(
                    {
                        message: `Festival not found: ${validated.festivalId}`,
                    },
                    { status: 404 }
                );
            }
            artistNames = Array.from(new Set(festival.lineup.map(act => act.artistName)));
        } else if (validated.artistNames) {
            artistNames = validated.artistNames;
        } else {
            return NextResponse.json(
                {
                    message: 'Must provide festivalId or artistNames',
                },
                { status: 400 }
            );
        }

        // Deduplicate artist names
        artistNames = Array.from(new Set(artistNames));

        const results: { name: string; status: 'crawled' | 'exists' | 'error'; error?: string }[] = [];
        for (const name of artistNames) {
            try {
                const existing = await artistService.searchArtistByName(name);
                if (existing) {
                    const artistId = existing.id; // Use the first existing artist's ID
                    results.push({ name, status: 'exists' });
                    if (validated.force === false) {
                        continue;
                    }
                    const populatedArtist = await artistService.crawlArtistDetails(artistId, {
                        context: festival
                            ? `Festival: ${festival.name}: ${festival.website}` +
                              (festival.website
                                  ? `Additinal info:\nhttps://www.google.com/search?q=${encodeURIComponent(existing.name + ' site:' + festival.website)}`
                                  : festival.name
                                    ? `Additinal info:\nhttps://www.google.com/search?q=${encodeURIComponent(existing.name + ' ' + festival.name)}`
                                    : '')
                            : undefined,
                    });
                    await artistService.saveArtist(populatedArtist);

                    // Invalidate cache for this artist
                    // do not await this call, it will be handled by the cache service in the background
                    container.getCacheService().invalidatePattern(`artist:${artistId}`);

                    continue;
                } else {
                    // crawls the artist by name
                    await artistService.createArtist({
                        name,
                        ...(festival ? { festivalName: festival.name, festivalUrl: festival.website } : {}),
                    });

                    // do nothing here with the cache
                    // as the artist is not linked to any festival yet
                }
                results.push({ name, status: 'crawled' });
            } catch (err) {
                logger.error('Artist crawl failed', toError(err));
                results.push({ name, status: 'error', error: toError(err)?.message });
            }
        }

        return NextResponse.json({
            status: 'success',
            message: 'Artist crawl completed',
            data: { results },
        });
    } catch (error) {
        logger.error('Admin artist crawl failed', toError(error));
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
                message: 'Artist crawl failed',
            },
            { status: 500 }
        );
    }
});
