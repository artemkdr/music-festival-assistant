import { DIContainer } from '@/lib/di-container';
import { Festival } from '@/lib/schemas';
import { getFestivalArtists, getFestivalDates, isFestivalFinished } from '@/lib/utils/festival-util';
import { NextResponse } from 'next/server';

/**
 * GET /api/discover/festivals
 * Public endpoint to get all festivals for discovery
 */
export async function GET(): Promise<Response> {
    const container = DIContainer.getInstance();
    const festivalService = container.getFestivalService();
    const logger = container.getLogger();
    try {
        const festivals: Festival[] = (await festivalService.getAllFestivals()).filter(festival => !isFestivalFinished(festival));
        // Optionally filter for only public/active festivals here
        return NextResponse.json({
            status: 'success',
            message: 'Festivals retrieved',
            data: festivals.map(festival => ({
                id: festival.id,
                name: festival.name,
                location: festival.location,
                startDate: getFestivalDates(festival).startDate,
                endDate: getFestivalDates(festival).endDate,
                artistsCount: getFestivalArtists(festival).length,
            })),
        });
    } catch (error) {
        logger.error('Failed to get festivals', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve festivals',
            },
            { status: 500 }
        );
    }
}
