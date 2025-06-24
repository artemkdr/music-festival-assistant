/**
 * Authentication register endpoint
 */
import { DIContainer } from '@/lib/di-container';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RegisterRequestSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const authService = container.getAuthService();

    try {
        logger.info('Register request received');

        const body = await request.json();
        const validated = RegisterRequestSchema.parse(body);

        const result = await authService.register(validated);

        if (result.success && result.user && result.token) {
            logger.info('Registration successful', { userId: result.user.id, email: result.user.email });

            return NextResponse.json({
                status: 'success',
                message: 'Registration successful',
                data: {
                    user: result.user,
                    token: result.token,
                    refreshToken: result.refreshToken,
                },
            });
        } else {
            logger.warn('Registration failed', { email: validated.email, error: result.error });

            return NextResponse.json(
                {
                    status: 'error',
                    message: result.error || 'Registration failed',
                },
                { status: 400 }
            );
        }
    } catch (error) {
        logger.error('Register endpoint error', error instanceof Error ? error : new Error(String(error)));

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Invalid request data',
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
                message: 'Internal server error',
            },
            { status: 500 }
        );
    }
}
