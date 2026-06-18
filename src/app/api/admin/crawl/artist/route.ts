/**
 * Admin endpoint for crawling artist data
 */
import { DIContainer } from '@/lib/di-container';
import { WebSearchError } from '@/lib/services/web-search';
import { requireAdmin } from '@/lib/utils/auth-utils';
import { toError } from '@/lib/utils/error-handler';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const adminReadOptions = { useCache: false } as const;

/**
 * Route for (re) crawling an existing artist by ID.
 * If you need to crawl a new artist, use the POST /api/admin/crawl/artists endpoint instead.
 */

const CrawlArtistRequestSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    spotifyId: z.string().optional(),
    context: z.string().optional(),
    webSearch: z
        .object({
            country: z.string().optional(),
            searchLang: z.string().optional(),
            count: z.number().int().min(1).max(50).optional(),
        })
        .optional(),
});

export const POST = requireAdmin(async (request: NextRequest): Promise<Response> => {
    const container = DIContainer.getInstance();
    const artistService = container.getArtistService();
    const logger = container.getLogger();

    try {
        logger.info('Admin artist crawl request received');
        const body = await request.json();
        const validated = CrawlArtistRequestSchema.parse(body);
        let artistName = validated.name;

        if (validated.id) {
            const existing = await artistService.getArtistById(validated.id, adminReadOptions);
            if (!existing) {
                return NextResponse.json(
                    {
                        message: `Artist not found: ${validated.id}`,
                    },
                    { status: 404 }
                );
            }
            artistName = existing.name;
        } else if (!artistName) {
            return NextResponse.json(
                {
                    message: 'Missing artist name or ID in request body',
                },
                { status: 400 }
            );
        }

        const result = await artistService.crawlArtistDetails(validated.id, {
            name: artistName,
            ...(validated.context ? { context: validated.context } : {}),
            ...(validated.spotifyId ? { spotifyId: validated.spotifyId } : {}),
            ...(validated.webSearch ? { webSearch: validated.webSearch } : {}),
        });

        return NextResponse.json({
            status: 'success',
            message: 'Artist crawl completed',
            data: result,
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
        if (error instanceof WebSearchError) {
            return NextResponse.json(
                {
                    message: `Artist crawl failed: ${error.message}`,
                    errorCode: error.code,
                },
                { status: error.statusCode || 502 }
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
