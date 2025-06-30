import { DIContainer } from '@/lib/di-container';
import { getFestivalArtists } from '@/lib/utils/festival-util';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const paramsSchema = z.object({
    id: z.string().min(1, 'Festival id is required'),
});

interface RouteParams {
    params: Promise<{ [key: string]: string }>;
}

/**
 * GET /api/discover/festivals/[id]/genres
 * Returns genres ({ name, count }) for a festival, sorted by popularity in the lineup
 */
export async function GET(request: NextRequest, context: RouteParams): Promise<Response> {
    const params = await context.params;
    const parseResult = paramsSchema.safeParse(params);
    if (!parseResult.success) {
        return NextResponse.json(
            {
                status: 'error',
                message: 'Invalid festival id',
            },
            { status: 400 }
        );
    }
    const { id } = await parseResult.data;
    const container = DIContainer.getInstance();
    const festivalService = container.getFestivalService();
    const artistService = container.getArtistService();
    const logger = container.getLogger();
    try {
        const festival = await festivalService.getFestivalById(id);
        if (!festival) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: `Festival not found: ${id}`,
                },
                { status: 404 }
            );
        }
        // Count genres in lineup
        const genreCount: Record<string, number> = {};
        const artists = getFestivalArtists(festival);
        for (const artistInfo of artists) {
            if (artistInfo.id) {
                const artist = await artistService.getArtistById(artistInfo.id);
                if (artist && artist.genre && artist.genre.length > 0) {
                    for (const genre of artist.genre) {
                        const genreLower = genre.toLowerCase();
                        genreCount[genreLower] = (genreCount[genreLower] || 0) + 1;
                    }
                }
            }
        }
        // Sort genres by popularity
        const sortedGenres = Object.entries(genreCount)
            .sort((a, b) => b[1] - a[1])
            .map(([genre]) => ({
                name: genre,
                count: genreCount[genre],
            }));
        return NextResponse.json({
            status: 'success',
            message: 'Genres retrieved',
            data: sortedGenres,
        });
    } catch (error) {
        logger.error('Failed to get festival genres', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve genres',
            },
            { status: 500 }
        );
    }
}
