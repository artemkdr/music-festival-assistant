/**
 * Public Festival API endpoint
 * GET /api/festivals/[id] - Get festival by ID (public endpoint)
 */
import { DIContainer } from '@/lib/di-container';
import { Festival } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/festivals/[id]
 * Get festival by ID (public endpoint - no admin required)
 */
export async function GET(request: NextRequest, context: RouteParams): Promise<Response> {
    const { id } = await context.params;
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalService = container.getFestivalService();

    if (!id) {
        return NextResponse.json(
            {
                status: 'error',
                message: 'Missing festival ID in route parameters',
            },
            { status: 400 }
        );
    }

    try {
        logger.info('Public festival detail request received', { festivalId: id });

        // Get festival from database (only published festivals, not cached data)
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

        // Return public festival data (no sensitive admin info)
        const publicFestival: Festival = {
            id: festival.id,
            name: festival.name,
            location: festival.location,
            description: festival.description,
            website: festival.website,
            imageUrl: festival.imageUrl,
            lineup: festival.lineup.map(act => ({
                id: act.id,
                artistName: act.artistName,
                artistId: act.artistId,
                festivalName: act.festivalName,
                festivalId: act.festivalId,
                date: act.date,
                time: act.time,
                stage: act.stage,
            })),
        };

        return NextResponse.json({
            status: 'success',
            message: 'Festival retrieved successfully',
            data: publicFestival,
        });
    } catch (error) {
        logger.error('Failed to get public festival', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve festival',
            },
            { status: 500 }
        );
    }
}
