/**
 * Admin endpoint for crawling artist data
 * Accepts a festivalId or a list of artist names, crawls missing artists, and saves them to the repository.
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/middleware/auth-middleware';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Route for (re) crawling an existing artist by ID.
 * If you need to crawl a new artist, use the POST /api/admin/crawl/artists endpoint instead.
 */

const CrawlArtistRequestSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    spotifyId: z.string().optional(),
    context: z.string().optional(),
});

export const POST = requireAdmin(async (request: NextRequest): Promise<Response> => {
    const container = DIContainer.getInstance();
    const artistService = container.getArtistService();
    const logger = container.getLogger();

    try {
        logger.info('Admin artist crawl request received');
        const body = await request.json();
        const validated = CrawlArtistRequestSchema.parse(body);
        const existing = await artistService.getArtistById(validated.id);
        if (!existing) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: `Artist not found: ${validated.id}`,
                },
                { status: 404 }
            );
        }

        const result = await artistService.crawlArtistDetails(validated.id, {
            context: validated.context,
            spotifyId: validated.spotifyId,
        });

        return NextResponse.json({
            status: 'success',
            message: 'Artist crawl completed',
            data: result,
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
