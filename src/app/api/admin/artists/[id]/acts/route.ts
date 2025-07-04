/**
 * Artist acts API endpoint
 * GET /api/admin/artists/[id]/acts - Get festivals where this artist performs
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/utils/auth-utils';
import { FestivalAct } from '@/lib/schemas';
import { User } from '@/lib/services/auth';
import { getActsByArtistId, getActsByArtistName, isFestivalFinished } from '@/lib/utils/festival-util';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ [key: string]: string }>;
}

export const GET = requireAdmin(async (request: NextRequest, user: User, context: RouteParams): Promise<Response> => {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const artistService = container.getArtistService();
    const festivalService = container.getFestivalService();

    const id = (await context.params).id;

    if (!id) {
        return NextResponse.json(
            {
                status: 'error',
                message: 'Missing artist ID in dynamic route parameters',
            },
            { status: 400 }
        );
    }

    try {
        logger.info('Artist acts request received', { artistId: id });

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
                const actsById = artist.id ? getActsByArtistId(festival, artist.id) : [];
                const actsByName = getActsByArtistName(festival, artist.name);
                for (const act of actsById) {
                    if (!acts.some(existingAct => existingAct.id === act.id)) {
                        acts.push({
                            ...act,
                            festivalId: festival.id,
                        });
                    }
                }
                for (const act of actsByName) {
                    if (!acts.some(existingAct => existingAct.id === act.id)) {
                        acts.push({
                            ...act,
                            festivalId: festival.id,
                        });
                    }
                }
            }
        }

        return NextResponse.json({
            status: 'success',
            message: 'Artist acts retrieved successfully',
            data: acts,
        });
    } catch (error) {
        logger.error('Failed to get artist acts', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve artist acts',
            },
            { status: 500 }
        );
    }
});
