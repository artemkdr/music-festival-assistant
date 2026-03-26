import { prisma } from '@/lib/repositories/providers/prisma/client';
import { RepositoryReadOptions } from '@/lib/repositories/interfaces';
import { ICacheService } from '@/lib/services/cache/interfaces';
import type { ILogger } from '@/lib/types/logger';
import { PrismaClient } from '@prisma/client';

interface ExecuteOperationOptions {
    cacheKey?: string | undefined;
    cacheTtlSeconds?: number | undefined;
    readOptions?: RepositoryReadOptions | undefined;
}

/**
 * Base Prisma repository class
 * Provides common database connection, error handling, and caching
 */
export abstract class BasePrismaRepository {
    protected readonly prisma: PrismaClient;
    protected readonly logger: ILogger;
    protected readonly context: string;

    constructor(
        logger: ILogger,
        context: string,
        private readonly cacheService?: ICacheService
    ) {
        this.prisma = prisma;
        this.logger = logger;
        this.context = context;
    }

    /**
     * Execute a Prisma operation with error handling, logging, and caching
     * @param operation Function that returns a Promise
     * @param operationName Description of the operation for logging
     * @param options Cache and read behavior options
     */
    protected async executeOperation<T>(operation: () => Promise<T>, operationName: string, options: ExecuteOperationOptions = {}): Promise<T> {
        const useCache = options.readOptions?.useCache !== false;

        // Try to get from cache first
        if (useCache && options.cacheKey) {
            const cachedResult = await this.getFromCache<T>(options.cacheKey);
            if (cachedResult) {
                this.logger.debug(`Using cached result for ${this.context} operation: ${operationName}`);
                return cachedResult;
            }
        }

        try {
            this.logger.debug(`Executing ${this.context} operation: ${operationName}`, {
                cached: useCache && !!options.cacheKey,
                useCache,
            });

            const result = await operation();

            this.logger.info(`${this.context} operation completed: ${operationName}`, {
                cached: false,
                useCache,
            });

            // Cache the result if cache key is provided
            if (useCache && options.cacheKey) {
                await this.setCache(options.cacheKey, result, options.cacheTtlSeconds);
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
    private async getFromCache<T>(cacheKey: string): Promise<T | null> {
        if (!this.cacheService) {
            return null; // No cache service available
        }
        if ((await this.cacheService.has(cacheKey)) === false) {
            return null;
        }
        const entry = await this.cacheService.get<T>(cacheKey);
        if (!entry) {
            return null;
        }
        return entry;
    }

    /**
     * Store data in cache
     * @param cacheKey Cache key
     * @param data Data to cache
     * @param ttlSeconds Time to live in seconds (optional, uses default if not provided)
     */
    private async setCache<T>(cacheKey: string, data: T, ttlSeconds: number = 7 * 24 * 60 * 60): Promise<void> {
        if (!this.cacheService) {
            return; // No cache service available
        }
        await this.cacheService.set(cacheKey, data, ttlSeconds);
        this.logger.debug(`Cache set for ${this.context}`, { cacheKey, ttlSeconds: ttlSeconds });
    }

    /**
     * Invalidate cache entries matching a pattern
     * @param pattern String pattern to match in cache keys
     */
    protected async invalidateCachePattern(pattern: string): Promise<void> {
        if (!this.cacheService) {
            return; // No cache service available
        }
        await this.cacheService.invalidatePattern(pattern);
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
