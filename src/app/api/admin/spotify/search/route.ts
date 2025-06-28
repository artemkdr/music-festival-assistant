/**
 * Admin endpoint for searching multiple artists on Spotify by name
 * Returns up to 10 matching artists for linking with festival acts
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/middleware/auth-middleware';
import { NextRequest, NextResponse } from 'next/server';

export const GET = requireAdmin(async (request: NextRequest): Promise<Response> => {
    const container = DIContainer.getInstance();
    const spotifyService = container.getSpotifyService();
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

        logger.info(`Searching Spotify artists with query: ${query}`);
        const artists = await spotifyService.searchArtistsByName(query);

        return NextResponse.json({
            status: 'success',
            message: `Found ${artists.length} artists`,
            data: { artists },
        });
    } catch (error) {
        logger.error('Spotify artist search failed', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Spotify artist search failed',
            },
            { status: 500 }
        );
    }
});
