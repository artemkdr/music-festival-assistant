/**
 * Dummy authentication provider for development/testing
 * Generates valid JWT tokens for any email/password combination
 */
import type { ILogger } from '@/lib/types/logger';
import type { IAuthProvider, AuthResult, LoginRequest, RegisterRequest, User } from './interfaces';
import { generateAccessToken, generateRefreshToken, verifyToken } from './jwt-utils';

/**
 * Dummy users for testing
 */
const DUMMY_USERS: User[] = [
    {
        id: 'admin-1',
        email: 'admin@music-festival.com',
        password: process.env.ADMIN_PASSWORD,
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date().toISOString(),
        preferences: {
            genres: ['Electronic', 'Rock'],
            location: 'San Francisco',
        },
    },
    {
        id: 'user-1',
        email: 'user@music-festival.com',
        name: 'Regular User',
        role: 'user',
        createdAt: new Date().toISOString(),
        preferences: {
            genres: ['Pop', 'Hip Hop'],
            location: 'New York',
        },
    },
];

/**
 * Dummy authentication provider
 * WARNING: This is for development only! Replace with real auth in production.
 */
export class DummyAuthProvider implements IAuthProvider {
    constructor(private readonly logger: ILogger) {}

    /**
     * Login with any email/password (always succeeds in dummy mode)
     */
    async login(request: LoginRequest): Promise<AuthResult> {
        this.logger.info('Dummy auth login attempt', { email: request.email });
        const user = DUMMY_USERS.find(u => u.email === request.email);
        if (!user || user.password !== request.password) {
            this.logger.warn('Dummy auth login failed - incorrect password', { email: request.email });
            return {
                success: false,
                error: 'Invalid email or password',
            };
        } else {
            user.lastLoginAt = new Date().toISOString();
        }

        const token = await this.generateToken(user);
        const refreshToken = generateRefreshToken(user);

        this.logger.info('Dummy auth login successful', { userId: user.id, email: user.email });

        return {
            success: true,
            user,
            token,
            refreshToken,
        };
    }

    /**
     * Register new user (always succeeds in dummy mode)
     */
    async register(request: RegisterRequest): Promise<AuthResult> {
        this.logger.info('Dummy auth register attempt', { email: request.email });

        // Check if user already exists
        const existingUser = DUMMY_USERS.find(u => u.email === request.email);
        if (existingUser) {
            return {
                success: false,
                error: 'User already exists',
            };
        }

        const user: User = {
            id: `user-${Date.now()}`,
            email: request.email,
            name: request.name,
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
        };

        DUMMY_USERS.push(user);

        const token = await this.generateToken(user);
        const refreshToken = generateRefreshToken(user);

        this.logger.info('Dummy auth register successful', { userId: user.id, email: user.email });

        return {
            success: true,
            user,
            token,
            refreshToken,
        };
    }

    /**
     * Verify JWT token and return user data
     */
    async verifyToken(token: string): Promise<User | null> {
        const payload = verifyToken(token);
        if (!payload) {
            return null;
        }

        const user = DUMMY_USERS.find(u => u.id === payload.userId);
        return user || null;
    }

    /**
     * Generate JWT token for user
     */
    async generateToken(user: User): Promise<string> {
        return generateAccessToken(user);
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string): Promise<AuthResult> {
        const payload = verifyToken(refreshToken);
        if (!payload || payload.type !== 'refresh') {
            return {
                success: false,
                error: 'Invalid refresh token',
            };
        }

        const user = DUMMY_USERS.find(u => u.id === payload.userId);
        if (!user) {
            return {
                success: false,
                error: 'User not found',
            };
        }

        const newToken = await this.generateToken(user);
        const newRefreshToken = generateRefreshToken(user);

        return {
            success: true,
            user,
            token: newToken,
            refreshToken: newRefreshToken,
        };
    }
}
