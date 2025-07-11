/**
 * Admin endpoint for searching multiple artists on Spotify by name
 * Returns up to 10 matching artists for linking with festival acts
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/utils/auth-utils';
import { toError } from '@/lib/utils/error-handler';
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
                    message: 'Missing query parameter "q"',
                },
                { status: 400 }
            );
        }

        logger.info(`Searching Spotify artists with query: ${query}`);
        // if query is likely to be a Spotify id or spotify uri then get by spotify id
        if (/^[a-zA-Z0-9-_]{20,}$/.test(query)) {
            logger.info(`Query is likely a Spotify ID: ${query}`);
            const artist = await spotifyService.getArtistById(query);
            if (!!artist) {
                return NextResponse.json({
                    status: 'success',
                    message: 'Found artist by ID',
                    data: { artists: [artist] },
                });
            }
        }

        // Otherwise, search for artists by name
        const artists = await spotifyService.searchArtistsByName(query);

        return NextResponse.json({
            status: 'success',
            message: `Found ${artists.length} artists`,
            data: { artists },
        });
    } catch (error) {
        logger.error('Spotify artist search failed', toError(error));
        return NextResponse.json(
            {
                message: 'Spotify artist search failed',
            },
            { status: 500 }
        );
    }
});
