/**
 * Artist performances API endpoint
 * GET /api/admin/artists/[id]/performances - Get festivals where this artist performs
 */
import { DIContainer } from '@/lib/di-container';
import { FestivalAct } from '@/lib/schemas';
import { getPerformanceByArtistName, isFestivalFinished } from '@/lib/utils/festival-util';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const artistService = container.getArtistService();
    const festivalService = container.getFestivalService();

    const { id } = await params;

    try {
        logger.info('Artist performances request received', { artistId: id });

        const artist = await artistService.getArtistById(id);
        if (!artist) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: `Artist not found: ${id}`,
                },
                { status: 404 }
            );
        }

        // Get all festivals and filter for ones that include this artist
        const allFestivals = await festivalService.getAllFestivals();
        const acts: FestivalAct[] = [];
        for (const festival of allFestivals) {
            if (!isFestivalFinished(festival)) {
                // Check if the artist is performing in this festival
                const act = getPerformanceByArtistName(festival, artist.name);
                if (act) {
                    acts.push(act);
                }
            }
        }

        return NextResponse.json({
            status: 'success',
            message: 'Artist performances retrieved successfully',
            data: acts,
        });
    } catch (error) {
        logger.error('Failed to get artist performances', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve artist performances',
            },
            { status: 500 }
        );
    }
}
