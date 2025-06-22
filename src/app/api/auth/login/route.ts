/**
 * Authentication login endpoint
 */
import { DIContainer } from '@/lib/container';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const LoginRequestSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const authService = container.getAuthService();

    try {
        logger.info('Login request received');

        const body = await request.json();
        const validated = LoginRequestSchema.parse(body);

        const result = await authService.login(validated);

        if (result.success && result.user && result.token) {
            logger.info('Login successful', { userId: result.user.id, email: result.user.email });

            return NextResponse.json({
                status: 'success',
                message: 'Login successful',
                data: {
                    user: result.user,
                    token: result.token,
                    refreshToken: result.refreshToken,
                },
            });
        } else {
            logger.warn('Login failed', { email: validated.email, error: result.error });

            return NextResponse.json(
                {
                    status: 'error',
                    message: result.error || 'Login failed',
                },
                { status: 401 }
            );
        }
    } catch (error) {
        logger.error('Login endpoint error', error instanceof Error ? error : new Error(String(error)));

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
