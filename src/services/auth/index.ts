/**
 * Auth service exports
 */

// Interfaces and types
export type { IAuthService, IAuthProvider, User, AuthResult, LoginRequest, RegisterRequest, JWTPayload } from './interfaces';

// Implementations
export { AuthService } from './auth-service';
export { DummyAuthProvider } from './dummy-auth-provider';

// Utilities
export { generateAccessToken, generateRefreshToken, verifyToken, extractTokenFromHeader } from './jwt-utils';
