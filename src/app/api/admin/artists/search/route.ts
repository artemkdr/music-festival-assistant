/**
 * Admin endpoint for searching artists in our database by name
 * Returns up to 10 matching artists for linking with festival acts
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/utils/auth-utils';
import { NextRequest, NextResponse } from 'next/server';

export const GET = requireAdmin(async (request: NextRequest): Promise<Response> => {
    const container = DIContainer.getInstance();
    const artistService = container.getArtistService();
    const logger = container.getLogger();

    try {
        const query = request.nextUrl.searchParams.get('q')?.trim();
        if (!query) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Missing query parameter "q"',
                },
                { status: 400 }
            );
        }

        logger.info(`Searching database artists with query: ${query}`);
        const artists = await artistService.searchArtistsByName(query);

        // Limit to 10 results for UI performance
        const limitedResults = artists.slice(0, 10);

        return NextResponse.json({
            status: 'success',
            message: `Found ${limitedResults.length} artists`,
            data: { artists: limitedResults },
        });
    } catch (error) {
        logger.error('Database artist search failed', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Artist search failed',
            },
            { status: 500 }
        );
    }
});
