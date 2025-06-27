/**
 * User profile API endpoint
 * GET /api/auth/profile - Get current user profile
 */
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { User } from '@/lib/services/auth';
import { NextRequest, NextResponse } from 'next/server';

export const GET = requireAuth(async (request: NextRequest, user: User): Promise<Response> => {
    return NextResponse.json({
        status: 'success',
        message: 'Profile retrieved successfully',
        data: user,
    });
});
