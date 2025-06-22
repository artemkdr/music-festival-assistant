/**
 * Authentication service interfaces
 */
import { z } from 'zod';

/**
 * User data schema
 */
export const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['admin', 'user']).default('user'),
    preferences: z
        .object({
            genres: z.array(z.string()).optional(),
            location: z.string().optional(),
        })
        .optional(),
    createdAt: z.string(),
    lastLoginAt: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Authentication result
 */
export interface AuthResult {
    success: boolean;
    user?: User;
    token?: string;
    refreshToken?: string;
    error?: string;
}

/**
 * Login request
 */
export interface LoginRequest {
    email: string;
    password: string;
}

/**
 * Register request
 */
export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

/**
 * JWT payload
 */
export interface JWTPayload {
    userId: string;
    email?: string;
    role?: string;
    type?: string; // 'refresh' for refresh tokens
    iat: number;
    exp: number;
}

/**
 * Auth provider interface
 */
export interface IAuthProvider {
    /**
     * Authenticate user with email/password
     */
    login(request: LoginRequest): Promise<AuthResult>;

    /**
     * Register new user
     */
    register(request: RegisterRequest): Promise<AuthResult>;

    /**
     * Verify JWT token and return user data
     */
    verifyToken(token: string): Promise<User | null>;

    /**
     * Generate JWT token for user
     */
    generateToken(user: User): Promise<string>;

    /**
     * Refresh access token
     */
    refreshToken(refreshToken: string): Promise<AuthResult>;
}

/**
 * Auth service interface
 */
export interface IAuthService extends IAuthProvider {
    /**
     * Get current user from request headers
     */
    getCurrentUser(authHeader?: string): Promise<User | null>;

    /**
     * Logout user (invalidate tokens)
     */
    logout(token: string): Promise<void>;
}
