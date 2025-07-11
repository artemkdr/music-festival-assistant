/**
 * Authentication context for managing user authentication state across the app
 * Provides login/logout functionality and user state management
 */
'use client';

import { authApi } from '@/app/lib/api-client/auth-api';
import { type AuthResponse } from '@/app/lib/api-client/types/auth-types';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthContextType {
    user: AuthResponse['user'] | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthResponse['user'] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Derived state
    const isAuthenticated = !!user;
    const isAdmin = user?.role === 'admin';

    /**
     * Check authentication status on app start
     */
    const checkAuth = async () => {
        try {
            setIsLoading(true);
            const token = authApi.getToken();

            if (!token) {
                setUser(null);
                setIsLoading(false);
                return;
            }

            // Validate token with server
            const response = await authApi.getProfile();

            if (response.status === 'success' && response.data) {
                setUser(response.data);
            } else {
                // Token invalid, clear it
                authApi.clearToken();
                setUser(null);
            }
        } catch {
            authApi.clearToken();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Login user
     */
    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            setIsLoading(true);
            const response = await authApi.login({ email, password });

            if (response.status === 'success' && response.data) {
                setUser(response.data.user);
                return { success: true };
            } else {
                return {
                    success: false,
                    error: response.message || 'Login failed',
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Login failed',
            };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Logout user
     */
    const logout = () => {
        authApi.logout();
        setUser(null);
    };

    // Check auth on mount if it's a protected route
    useEffect(() => {
        // Only check auth if we have a token
        authApi
            .getToken()
            .then(token => {
                if (token) {
                    checkAuth();
                } else {
                    setUser(null);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                setUser(null);
                setIsLoading(false);
            });
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        checkAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
