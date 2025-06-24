/**
 * Authentication middleware for API routes
 */
import { NextRequest } from 'next/server';
import { DIContainer } from '@/lib/container';
import type { User } from '@/services/auth/interfaces';

/**
 * Extract user from request
 */
export async function getCurrentUser(request: NextRequest): Promise<User | null> {
    const container = DIContainer.getInstance();
    const authService = container.getAuthService();

    const authHeader = request.headers.get('authorization');
    return authService.getCurrentUser(authHeader || undefined);
}

/**
 * Require authentication for a route handler
 */
export function requireAuth(handler: (request: NextRequest, user: User) => Promise<Response>) {
    return async (request: NextRequest): Promise<Response> => {
        const user = await getCurrentUser(request);

        if (!user) {
            return new Response(
                JSON.stringify({
                    status: 'error',
                    message: 'Authentication required',
                }),
                {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        return handler(request, user);
    };
}

/**
 * Require admin role for a route handler
 */
export function requireAdmin(handler: (request: NextRequest, user: User) => Promise<Response>) {
    return requireAuth(async (request: NextRequest, user: User): Promise<Response> => {
        if (user.role !== 'admin') {
            return new Response(
                JSON.stringify({
                    status: 'error',
                    message: 'Admin access required',
                }),
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        return handler(request, user);
    });
}
