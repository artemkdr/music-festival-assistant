/**
 * Unit tests for MemoryCacheService
 * Covers set, get, has, delete, invalidatePattern, clear, and TTL expiration
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryCacheService } from '@/lib/services/cache/memory-cache-service';
import type { ILogger } from '@/lib/types/logger';

const createLogger = (): ILogger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
});

describe('MemoryCacheService', () => {
    let logger: ILogger;
    let cache: MemoryCacheService;

    beforeEach(() => {
        logger = createLogger();
        cache = new MemoryCacheService(logger);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('sets and gets a value', async () => {
        await cache.set('foo', 123, 10);
        const value = await cache.get<number>('foo');
        expect(value).toBe(123);
        expect(await cache.has('foo')).toBe(true);
    });

    it('returns null for missing key', async () => {
        const value = await cache.get<string>('missing');
        expect(value).toBeNull();
        expect(await cache.has('missing')).toBe(false);
    });

    it('expires values after TTL', async () => {
        await cache.set('bar', 'baz', 1); // 1 second TTL
        expect(await cache.get('bar')).toBe('baz');
        // Fast-forward time
        vi.setSystemTime(Date.now() + 2000);
        expect(await cache.get('bar')).toBeNull();
        expect(await cache.has('bar')).toBe(false);
    });

    it('deletes a key', async () => {
        await cache.set('del', 42, 10);
        await cache.delete('del');
        expect(await cache.get('del')).toBeNull();
        expect(await cache.has('del')).toBe(false);
    });

    it('invalidates keys by pattern', async () => {
        await cache.set('user:1', 'a', 10);
        await cache.set('user:2', 'b', 10);
        await cache.set('other', 'c', 10);
        await cache.invalidatePattern('user:');
        expect(await cache.get('user:1')).toBeNull();
        expect(await cache.get('user:2')).toBeNull();
        expect(await cache.get('other')).toBe('c');
    });

    it('clears all keys', async () => {
        await cache.set('a', 1, 10);
        await cache.set('b', 2, 10);
        await cache.clear();
        expect(await cache.get('a')).toBeNull();
        expect(await cache.get('b')).toBeNull();
    });

    it('removes expired items on has()', async () => {
        await cache.set('exp', 'gone', 1);
        vi.setSystemTime(Date.now() + 2000);
        expect(await cache.has('exp')).toBe(false);
        // Should remove from cache
        expect(await cache.get('exp')).toBeNull();
    });
});
