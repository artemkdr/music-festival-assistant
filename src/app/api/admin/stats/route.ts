/**
 * Admin statistics API endpoint
 * GET /api/admin/stats - Get dashboard statistics
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/utils/auth-utils';
import { toError } from '@/lib/utils/error-handler';
import { NextResponse } from 'next/server';

export const GET = requireAdmin(async (): Promise<Response> => {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalService = container.getFestivalService();
    const artistService = container.getArtistService();

    try {
        logger.info('Admin stats request received');

        // Get all data to calculate statistics
        const [festivals, artists] = await Promise.all([festivalService.getAllFestivals(), artistService.getAllArtists()]);

        // Calculate total acts across all festivals
        const totalActs = festivals.reduce((total, festival) => total + festival.lineup.length, 0);

        // For now, we'll use a placeholder for active sessions since we don't have session tracking
        // In a real app, this would come from a session store or analytics
        const activeSessions = Math.floor(Math.random() * 50) + 10; // Mock for demo

        const stats = {
            festivals: festivals.length,
            artists: artists.length,
            acts: totalActs,
            activeSessions,
        };

        return NextResponse.json({
            status: 'success',
            message: 'Statistics retrieved successfully',
            data: stats,
        });
    } catch (error) {
        logger.error('Failed to get admin stats', toError(error));
        return NextResponse.json(
            {
                message: 'Failed to retrieve statistics',
            },
            { status: 500 }
        );
    }
});
