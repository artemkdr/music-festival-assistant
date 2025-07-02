import { prisma } from '@/lib/repositories/providers/prisma/client';
import type { ILogger } from '@/lib/types/logger';
import { PrismaClient } from '@prisma/client';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // time to live in milliseconds
}

/**
 * Cache configuration options
 */
interface CacheConfig {
    defaultTtl: number; // default TTL in milliseconds
    maxSize: number; // maximum number of cache entries
    enabled: boolean; // whether caching is enabled
}

/**
 * Base Prisma repository class
 * Provides common database connection, error handling, and caching
 */
export abstract class BasePrismaRepository {
    protected readonly prisma: PrismaClient;
    protected readonly logger: ILogger;
    protected readonly context: string;
    private readonly cache: Map<string, CacheEntry<unknown>>;
    private readonly cacheConfig: CacheConfig;

    constructor(logger: ILogger, context: string, cacheConfig?: Partial<CacheConfig>) {
        this.prisma = prisma;
        this.logger = logger;
        this.context = context;
        this.cache = new Map();

        // Default cache configuration
        this.cacheConfig = {
            defaultTtl: 5 * 60 * 1000, // 5 minutes
            maxSize: 1000, // 1000 entries
            enabled: true,
            ...cacheConfig,
        };
    }

    /**
     * Execute a Prisma operation with error handling, logging, and caching
     * @param operation Function that returns a Promise
     * @param operationName Description of the operation for logging
     * @param cacheKey Optional cache key for caching results
     * @param cacheTtl Cache TTL in milliseconds (optional, uses default if not provided)
     */
    protected async executeOperation<T>(operation: () => Promise<T>, operationName: string, cacheKey?: string, cacheTtl?: number): Promise<T> {
        // Try to get from cache first
        if (cacheKey) {
            const cachedResult = this.getFromCache<T>(cacheKey);
            if (cachedResult) {
                this.logger.debug(`Using cached result for ${this.context} operation: ${operationName}`);
                return cachedResult;
            }
        }

        try {
            this.logger.debug(`Executing ${this.context} operation: ${operationName}`, {
                cached: !!cacheKey,
            });

            const result = await operation();

            this.logger.info(`${this.context} operation completed: ${operationName}`, {
                cached: false,
            });

            // Cache the result if cache key is provided
            if (cacheKey) {
                this.setCache(cacheKey, result, cacheTtl);
            }

            return result;
        } catch (error) {
            this.logger.error(`${this.context} operation failed: ${operationName}`, error instanceof Error ? error : String(error));
            throw error;
        }
    }

    /**
     * Handle database constraint violations and provide meaningful error messages
     * @param error Database error
     * @param operation Operation being performed
     */
    protected handleDatabaseError(error: unknown, operation: string): never {
        this.logger.error(`Database error in ${this.context} during ${operation}`, error instanceof Error ? error : String(error));

        // Handle common Prisma errors
        if (error && typeof error === 'object' && 'code' in error) {
            const errorCode = (error as { code: string }).code;

            if (errorCode === 'P2002') {
                throw new Error(`Duplicate record: ${operation}`);
            }
            if (errorCode === 'P2003') {
                throw new Error(`Foreign key constraint violation: ${operation}`);
            }
            if (errorCode === 'P2025') {
                throw new Error(`Record not found: ${operation}`);
            }
        }

        // Re-throw original error if not a known constraint violation
        throw error;
    }

    /**
     * Generate a cache key from operation and parameters
     * @param operation Operation name
     * @param params Operation parameters
     * @returns Cache key string
     */
    protected generateCacheKey(operation: string, params: Record<string, unknown> = {}): string {
        const paramsStr = JSON.stringify(params);
        return `${this.context}:${operation}:${paramsStr}`;
    }

    /**
     * Get data from cache if available and not expired
     * @param cacheKey Cache key
     * @returns Cached data or null if not found/expired
     */
    private getFromCache<T>(cacheKey: string): T | null {
        if (!this.cacheConfig.enabled) {
            return null;
        }

        const entry = this.cache.get(cacheKey) as CacheEntry<T> | undefined;
        if (!entry) {
            return null;
        }

        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(cacheKey);
            this.logger.debug(`Cache entry expired for ${this.context}`, { cacheKey });
            return null;
        }

        this.logger.debug(`Cache hit for ${this.context}`, { cacheKey });
        return entry.data;
    }

    /**
     * Store data in cache
     * @param cacheKey Cache key
     * @param data Data to cache
     * @param ttl Time to live in milliseconds (optional, uses default if not provided)
     */
    private setCache<T>(cacheKey: string, data: T, ttl?: number): void {
        if (!this.cacheConfig.enabled) {
            return;
        }

        // Clean up cache if it's getting too large
        if (this.cache.size >= this.cacheConfig.maxSize) {
            this.cleanupExpiredEntries();

            // If still too large after cleanup, remove oldest entries
            if (this.cache.size >= this.cacheConfig.maxSize) {
                const entriesToRemove = Math.floor(this.cacheConfig.maxSize * 0.2); // Remove 20%
                const keys = Array.from(this.cache.keys());
                for (let i = 0; i < entriesToRemove && i < keys.length; i++) {
                    const key = keys[i];
                    if (key) {
                        this.cache.delete(key);
                    }
                }
                this.logger.debug(`Cache cleanup: removed ${entriesToRemove} entries for ${this.context}`);
            }
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl ?? this.cacheConfig.defaultTtl,
        };

        this.cache.set(cacheKey, entry);
        this.logger.debug(`Cache set for ${this.context}`, { cacheKey, ttl: entry.ttl });
    }

    /**
     * Remove expired entries from cache
     */
    private cleanupExpiredEntries(): void {
        const now = Date.now();
        let removedCount = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            this.logger.debug(`Cache cleanup: removed ${removedCount} expired entries for ${this.context}`);
        }
    }

    /**
     * Clear all cache entries for this repository
     */
    protected clearCache(): void {
        const size = this.cache.size;
        this.cache.clear();
        this.logger.info(`Cache cleared for ${this.context}`, { entriesRemoved: size });
    }

    /**
     * Invalidate cache entries matching a pattern
     * @param pattern String pattern to match in cache keys
     */
    protected invalidateCachePattern(pattern: string): void {
        let removedCount = 0;
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                removedCount++;
            }
        }
        if (removedCount > 0) {
            this.logger.debug(`Cache invalidation for ${this.context}`, { pattern, entriesRemoved: removedCount });
        }
    }

    /**
     * Initialize the repository
     * This should be called during application startup
     */
    public async initialize(): Promise<void> {
        try {
            // Test database connection
            await this.prisma.$connect();

            this.logger.info(`${this.context} repository initialized successfully`);
        } catch (error) {
            this.logger.error(`Failed to initialize ${this.context} repository`, error instanceof Error ? error : String(error));
            throw error;
        }
    }
}
