/**
 * Individual festival API endpoint
 * GET /api/admin/festivals/[id] - Get festival by ID
 */
import { requireAdmin } from '@/lib/api/auth-middleware';
import { DIContainer } from '@/lib/container';
import { User } from '@/services/auth';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
    // Apply admin authentication manually since requireAdmin doesn't support route params properly
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalRepo = container.getFestivalRepository();

    try {
        const id = await params.id;

        logger.info('Admin festival detail request received', { festivalId: id });
        
        const festival = await festivalRepo.getFestivalById(id);

        if (!festival) {
            return NextResponse.json({
                status: 'error',
                message: `Festival not found: ${id}`,
            }, { status: 404 });
        }

        return NextResponse.json({
            status: 'success',
            message: 'Festival retrieved successfully',
            data: festival,
        });
    } catch (error) {
        logger.error('Failed to get festival', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to retrieve festival',
            },
            { status: 500 }
        );
    }
}
