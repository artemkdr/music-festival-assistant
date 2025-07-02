/**
 * Protected route component for admin-only pages
 * Redirects non-admin users and shows loading states
 */
'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useEffect, type ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    requireAdmin?: boolean;
    fallbackPath?: string;
}

export function ProtectedRoute({ children, requireAdmin = false, fallbackPath = '/admin/login' }: ProtectedRouteProps) {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated) {
            window.location.href = fallbackPath;
            return;
        }

        if (requireAdmin && !isAdmin) {
            window.location.href = '/';
            return;
        }
    }, [isAuthenticated, isAdmin, isLoading, requireAdmin, fallbackPath]);

    // Show loading while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-magic mx-auto mb-4"></div>
                    <p className="text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // Don't render children if not authenticated or not admin (when required)
    if (!isAuthenticated || (requireAdmin && !isAdmin)) {
        return null;
    }

    return <>{children}</>;
}

/**
 * Higher-order component for protecting admin routes
 */
export function withAdminAuth<P extends object>(Component: React.ComponentType<P>) {
    return function AdminProtectedComponent(props: P) {
        return (
            <ProtectedRoute requireAdmin>
                <Component {...props} />
            </ProtectedRoute>
        );
    };
}
