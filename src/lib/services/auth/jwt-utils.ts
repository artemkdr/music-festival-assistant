/**
 * JWT utility functions for token generation and verification
 */
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { User, JWTPayload } from './interfaces';

/**
 * JWT configuration
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate JWT access token for user
 */
export function generateAccessToken(user: User): string {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'music-festival-assistant',
        audience: 'music-festival-app',
    } as SignOptions);
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(user: User): string {
    const payload = {
        userId: user.id,
        type: 'refresh',
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'music-festival-assistant',
        audience: 'music-festival-app',
    } as SignOptions);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'music-festival-assistant',
            audience: 'music-festival-app',
        });

        return decoded as JWTPayload;
    } catch {
        return null;
    }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}
