import { NextRequest, NextResponse } from 'next/server';
import { DIContainer } from '@/lib/container';

export async function GET(request: NextRequest) {
    const logger = DIContainer.getInstance().getLogger();
    const spotifyService = DIContainer.getInstance().getSpotifyApiService();
    const query = request.nextUrl.searchParams.get('q');
    if (!query) {
        return NextResponse.json({ status: 'error', message: 'Missing query parameter' }, { status: 400 });
    }
    try {
        const results = await spotifyService.searchArtistByName(query);
        // Always return an array for frontend mapping
        return NextResponse.json({ status: 'success', data: { artists: Array.isArray(results) ? results : results ? [results] : [] } });
    } catch (error) {
        logger.error('Failed to get artists from Spotify', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve artists from Spotify',
            },
            { status: 500 }
        );
    }
}
