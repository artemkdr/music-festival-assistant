/**
 * Admin endpoint for crawling artist data
 * Accepts a festivalId or a list of artist names, crawls missing artists, and saves them to the repository.
 */
import { requireAdmin } from '@/lib/api/middleware/auth-middleware';
import { DIContainer } from '@/lib/container';
import { generateArtistId } from '@/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CrawlArtistsRequestSchema = z.object({
    festivalId: z.string().optional(),
    artistNames: z.array(z.string()).optional(),
    force: z.boolean().optional().default(false), // Optional force flag to re-crawl existing artists
});

export const POST = requireAdmin(async (request: NextRequest): Promise<Response> => {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const artistRepo = container.getArtistRepository();
    const festivalRepo = container.getFestivalRepository();
    const artistCrawler = container.getArtistCrawlerService();

    try {
        logger.info('Admin artist crawl request received');
        const body = await request.json();
        const validated = CrawlArtistsRequestSchema.parse(body);

        let artistNames: string[] = [];
        if (validated.festivalId) {
            const festival = await festivalRepo.getFestivalById(validated.festivalId);
            if (!festival) {
                return NextResponse.json(
                    {
                        status: 'error',
                        message: `Festival not found: ${validated.festivalId}`,
                    },
                    { status: 404 }
                );
            }
            artistNames = festival.performances.map(p => p.artist.name);
        } else if (validated.artistNames) {
            artistNames = validated.artistNames;
        } else {
            return NextResponse.json(
                {
                    status: 'error',
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
                let artistId = generateArtistId();

                const existing = await artistRepo.searchArtistsByName(name);
                if (existing.length > 0) {
                    artistId = existing[0]!.id; // Use the first existing artist's ID
                    results.push({ name, status: 'exists' });
                    if (validated.force === false) {
                        continue;
                    }
                }

                // crawls the artist by name
                const artist = await artistCrawler.crawlArtistByName(name);
                results.push({ name, status: 'crawled' });
                artist.id = artistId; // Ensure the artist has the correct ID
                // Save the crawled artist to the repository
                await artistRepo.saveArtist(artist);
            } catch (err) {
                logger.error('Artist crawl failed', err instanceof Error ? err : new Error(String(err)));
                results.push({ name, status: 'error', error: err instanceof Error ? err.message : String(err) });
            }
        }

        return NextResponse.json({
            status: 'success',
            message: 'Artist crawl completed',
            data: { results },
        });
    } catch (error) {
        logger.error('Admin artist crawl failed', error instanceof Error ? error : new Error(String(error)));
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    status: 'error',
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
                status: 'error',
                message: error instanceof Error ? error.message : 'Artist crawl failed',
            },
            { status: 500 }
        );
    }
});
