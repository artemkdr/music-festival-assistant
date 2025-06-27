/**
 * Main authentication service
 */

import { ILogger } from '@/lib/types/logger';
import type { IAuthProvider, IAuthService, User } from './interfaces';
import { extractTokenFromHeader } from './jwt-utils';

/**
 * Authentication service implementation
 */
export class AuthService implements IAuthService {
    private tokenBlacklist = new Set<string>();

    constructor(
        private readonly authProvider: IAuthProvider,
        private readonly logger: ILogger
    ) {}

    /**
     * Delegate to auth provider
     */
    async login(request: { email: string; password: string }) {
        return this.authProvider.login(request);
    }

    /**
     * Delegate to auth provider
     */
    async register(request: { email: string; password: string; name: string }) {
        return this.authProvider.register(request);
    }

    /**
     * Delegate to auth provider
     */
    async verifyToken(token: string): Promise<User | null> {
        if (this.tokenBlacklist.has(token)) {
            return null;
        }
        return this.authProvider.verifyToken(token);
    }

    /**
     * Delegate to auth provider
     */
    async generateToken(user: User): Promise<string> {
        return this.authProvider.generateToken(user);
    }

    /**
     * Delegate to auth provider
     */
    async refreshToken(refreshToken: string) {
        return this.authProvider.refreshToken(refreshToken);
    }

    /**
     * Get current user from request headers
     */
    async getCurrentUser(authHeader?: string): Promise<User | null> {
        const token = extractTokenFromHeader(authHeader);
        if (!token) {
            return null;
        }

        return this.verifyToken(token);
    }

    /**
     * Logout user (invalidate token)
     */
    async logout(token: string): Promise<void> {
        this.tokenBlacklist.add(token);
        this.logger.info('User logged out, token blacklisted');
    }
}
