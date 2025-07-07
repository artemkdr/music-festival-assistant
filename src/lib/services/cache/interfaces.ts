export interface ICacheService {
    /**
     * Check if a key exists in the cache
     * @param key Cache key
     * @returns True if the key exists, false otherwise
     */
    has(key: string): Promise<boolean>;

    /**
     * Get cached data by key
     * @param key Cache key
     * @returns Cached data or null if not found
     */
    get<T = unknown>(key: string): Promise<T | null>;

    /**
     * Set data in cache with optional TTL
     * @param key Cache key
     * @param value Data to cache
     * @param ttl Time to live in seconds
     */
    set(key: string, value: unknown, ttl?: number): Promise<void>;

    /**
     * Delete data from cache by key
     * @param key Cache key
     */
    delete(key: string): Promise<void>;

    /**
     * Invalidate cache entries matching a pattern     *
     * @param pattern String pattern to match in cache keys
     */
    invalidatePattern(pattern: string): Promise<void>;

    /**
     * Clear the entire cache
     */
    clear(): Promise<void>;
}
