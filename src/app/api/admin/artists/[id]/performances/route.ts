/**
 * Artist performances API endpoint
 * GET /api/admin/artists/[id]/performances - Get festivals where this artist performs
 */
import { DIContainer } from '@/lib/container';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalRepo = container.getFestivalRepository();
    const artistRepo = container.getArtistRepository();
    const { id } = await params;

    try {
        logger.info('Artist performances request received', { artistId: id });

        const artist = await artistRepo.getArtistById(id);
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
        const allFestivals = await festivalRepo.getAllFestivals();
        const performances = allFestivals
            .filter(festival => festival.performances.some(perf => perf.artist.id === artist.id || perf.artist.name.toLowerCase() === artist.name.toLowerCase()))
            .map(festival => {
                const performance = festival.performances.find(perf => perf.artist.id === artist.id || perf.artist.name.toLowerCase() === artist.name.toLowerCase());
                return {
                    festivalId: festival.id,
                    festivalName: festival.name,
                    date: performance?.startTime ? festival.startDate : undefined,
                    time: performance?.startTime,
                    stage: performance?.stage,
                };
            });

        return NextResponse.json({
            status: 'success',
            message: 'Artist performances retrieved successfully',
            data: performances,
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
