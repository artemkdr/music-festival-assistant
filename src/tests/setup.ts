// Vitest global setup for all tests
import { afterEach, vi } from 'vitest';

// Polyfill fetch if not available (Node < 18)

if (!globalThis.fetch) {
    // @ts-expect-error: node-fetch types may not be present
    globalThis.fetch = (...args: Parameters<typeof fetch>) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

// Optionally set up environment variables for tests

process.env.LOG_LEVEL = 'silent';

// Reset all mocks after each test
afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
});

// Add any global test setup here (e.g., mock next/router, next/head, etc.)
// Example:
// vi.mock('next/router', () => require('next-router-mock'));
