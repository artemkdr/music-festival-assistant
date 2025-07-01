/**
 * Authentication utilities for API routes
 * These are higher-order functions that wrap API route handlers
 */
import { NextRequest } from 'next/server';
import { DIContainer } from '@/lib/di-container';
import type { User } from '@/lib/services/auth/interfaces';

/**
 * Extract user from request using the auth service
 * @param request - The Next.js request object
 * @returns The authenticated user or null if not authenticated
 */
export async function getCurrentUser(request: NextRequest): Promise<User | null> {
    const container = DIContainer.getInstance();
    const authService = container.getAuthService();

    const authHeader = request.headers.get('authorization');
    return authService.getCurrentUser(authHeader || undefined);
}

/**
 * Higher-order function that requires authentication for a route handler
 * @param handler - The route handler that requires an authenticated user
 * @returns A wrapped handler that checks authentication
 */
export function requireAuth(
    handler: (
        request: NextRequest,
        user: User,
        context: {
            params: Promise<{ [key: string]: string }>;
        }
    ) => Promise<Response>
) {
    return async (
        request: NextRequest,
        context: {
            params: Promise<{ [key: string]: string }>;
        }
    ): Promise<Response> => {
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

        return handler(request, user, context);
    };
}

/**
 * Higher-order function that requires admin role for a route handler
 * @param handler - The route handler that requires admin access
 * @returns A wrapped handler that checks authentication and admin role
 */
export function requireAdmin(
    handler: (
        request: NextRequest,
        user: User,
        context: {
            params: Promise<{ [key: string]: string }>;
        }
    ) => Promise<Response>
) {
    return requireAuth(
        async (
            request: NextRequest,
            user: User,
            context: {
                params: Promise<{ [key: string]: string }>;
            }
        ): Promise<Response> => {
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

            return handler(request, user, context);
        }
    );
}
