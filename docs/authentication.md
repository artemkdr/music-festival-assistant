# Authentication System

This project now includes a comprehensive JWT-based authentication system with role-based access control.

## Features

- **JWT-based authentication** with access and refresh tokens
- **Role-based access control** (admin/user roles)
- **Dummy auth provider** for development (generates valid tokens for any email/password)
- **Token caching** and automatic refresh
- **Auth middleware** for protecting API routes
- **Common API client** with automatic token handling

## Quick Start

### 1. Login/Register via API

```typescript
import { apiClient } from '@/lib/api/client';

// Login
const loginResult = await apiClient.login({
    email: 'admin@music-festival.com',
    password: 'any-password'
});

// Register
const registerResult = await apiClient.register({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe'
});
```

### 2. Make Authenticated API Calls

```typescript
// Token is automatically included in requests
const festivals = await apiClient.crawlFestival('https://example-festival.com');
const artists = await apiClient.crawlArtists({ artistNames: ['Artist 1', 'Artist 2'] });
```

### 3. Protecting API Routes

```typescript
// Admin-only route
export const POST = requireAdmin(async (request: NextRequest, user: User) => {
    // Route handler with authenticated admin user
    return NextResponse.json({ message: `Hello ${user.name}` });
});

// User authentication required
export const GET = requireAuth(async (request: NextRequest, user: User) => {
    // Route handler with authenticated user
    return NextResponse.json({ user });
});
```

## Pre-configured Test Accounts

The dummy auth provider includes these test accounts:

- **Admin**: `admin@music-festival.com` (any password)
- **User**: `user@music-festival.com` (any password)

Any other email will create a new user account automatically.

## Environment Variables

Add these to your `.env.local`:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

## API Endpoints

- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new user
- `POST /api/admin/crawl/festival` - Admin-only festival crawling
- `POST /api/admin/crawl/artists` - Admin-only artist crawling

## Production Notes

⚠️ **Important**: The dummy auth provider is for development only! 

For production, replace `DummyAuthProvider` in the DI container with a real auth provider that:
- Validates passwords securely (bcrypt, etc.)
- Stores users in a real database
- Implements proper security measures

## Client-Side Usage

```typescript
import { apiClient } from '@/lib/api/client';

// Login and token is automatically stored
await apiClient.login({ email: 'user@example.com', password: 'password' });

// All subsequent requests include the auth token
const profile = await apiClient.getProfile();

// Logout clears the token
await apiClient.logout();
```

The API client automatically:
- Stores tokens in localStorage
- Includes auth headers in requests
- Handles token refresh (when implemented)
- Provides type-safe API methods
