/**
 * Next.js Middleware - runs on Edge Runtime
 * Handles route-level authentication and authorization
 */
import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware function that runs on matching routes
 */
export default function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // @TODO migrate auth logic here

    return NextResponse.next();
}

/**
 * Configure which routes this middleware should run on
 */
export const config = {    
    matcher: [
        '/admin/:path*', // Match all admin routes
        '/api/:path*', // Match all API routes
    ],
};
