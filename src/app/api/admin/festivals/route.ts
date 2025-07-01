/**
 * Festivals API endpoints
 * GET /api/admin/festivals - Get all festivals
 * POST /api/admin/festivals - Create/save a new festival
 */
import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/utils/auth-utils';
import { FestivalSchema } from '@/lib/schemas';
import type { User } from '@/lib/services/auth/interfaces';
import { toError } from '@/lib/utils/error-handler';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * GET /api/admin/festivals
 * Get all festivals (Admin only)
 */
export const GET = requireAdmin(async (): Promise<Response> => {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalService = container.getFestivalService();

    try {
        logger.info('Admin festivals list request received');

        const festivals = await festivalService.getAllFestivals();
        return NextResponse.json({
            status: 'success',
            message: 'Festivals retrieved successfully',
            data: festivals,
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
});

/**
 * POST /api/admin/festivals
 * Create/save a new festival (Admin only)
 */
export const POST = requireAdmin(async (request: NextRequest, user: User): Promise<Response> => {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const festivalService = container.getFestivalService();

    try {
        logger.info('Admin festival creation request received', { userId: user.id, userEmail: user.email });

        // Parse and validate request body
        const body = await request.json();
        const validatedFestival = FestivalSchema.parse(body);

        logger.info('Saving festival...', {
            festivalName: validatedFestival.name,
            requestedBy: user.id,
        });

        // Save the festival data
        const festivalId = await festivalService.saveFestival(validatedFestival);

        logger.info('Festival saved successfully', {
            festivalId: validatedFestival.id,
            festivalName: validatedFestival.name,
            savedBy: user.id,
        });

        return NextResponse.json({
            status: 'success',
            message: 'Festival saved successfully',
            data: {
                id: festivalId,
            },
        });
    } catch (error) {
        logger.error('Admin festival creation failed', toError(error));

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Invalid festival data',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Festival creation failed',
            },
            { status: 500 }
        );
    }
});
