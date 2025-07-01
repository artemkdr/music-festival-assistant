import { neon } from '@neondatabase/serverless';
import type { ILogger } from '@/lib/types/logger';

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
 * Base Neon PostgreSQL repository class
 * Provides common database connection, error handling, and caching
 */
export abstract class BaseNeonRepository {
    protected readonly sql: ReturnType<typeof neon>;
    protected readonly logger: ILogger;
    protected readonly context: string;
    private readonly cache: Map<string, CacheEntry<unknown>>;
    private readonly cacheConfig: CacheConfig;

    constructor(logger: ILogger, context: string, cacheConfig?: Partial<CacheConfig>) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required for Neon database connection');
        }

        this.sql = neon(process.env.DATABASE_URL);
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
     * Execute a database query with error handling, logging, and caching
     * @param queryText SQL query template
     * @param params Query parameters
     * @param operation Description of the operation for logging
     * @param cacheTtl Cache TTL in milliseconds (optional, uses default if not provided)
     * @param useCache Whether to use caching for this query (default: true for SELECT queries)
     */
    protected async executeQuery<T = Record<string, unknown>>(
        queryText: string,
        params: (string | number | boolean | null)[] = [],
        operation: string,
        cacheTtl?: number,
        useCache?: boolean
    ): Promise<T[]> {
        // Determine if we should use cache (default to true for SELECT queries)
        const shouldUseCache = useCache ?? queryText.trim().toUpperCase().startsWith('SELECT');
        const cacheKey = shouldUseCache ? this.generateCacheKey(queryText, params) : '';

        // Try to get from cache first
        if (shouldUseCache) {
            const cachedResult = this.getFromCache<T[]>(cacheKey);
            if (cachedResult) {
                this.logger.debug(`Using cached result for ${this.context} query: ${operation}`);
                return cachedResult;
            }
        }

        try {
            this.logger.debug(`Executing ${this.context} query: ${operation}`, {
                queryPreview: queryText.substring(0, 100) + (queryText.length > 100 ? '...' : ''),
                paramsCount: params.length,
                cached: shouldUseCache,
            });

            // For Neon serverless, we need to use template literals
            // Build parameterized query by replacing placeholders
            let processedQuery = queryText;
            params.forEach((param, index) => {
                const placeholder = `$${index + 1}`;
                const value = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param === null ? 'NULL' : String(param);
                processedQuery = processedQuery.replace(placeholder, value);
            });

            // Create proper template strings array for Neon
            const templateStringsArray = Object.assign([processedQuery], { raw: [processedQuery] }) as TemplateStringsArray;
            const result = await this.sql(templateStringsArray);

            this.logger.info(`${this.context} query completed: ${operation}`, {
                rowCount: Array.isArray(result) ? result.length : 1,
                cached: false,
            });

            const typedResult = result as T[];

            // Cache the result if it's a SELECT query
            if (shouldUseCache) {
                this.setCache(cacheKey, typedResult, cacheTtl);
            }

            return typedResult;
        } catch (error) {
            this.logger.error(`${this.context} query failed: ${operation}`, error instanceof Error ? error : String(error), {
                queryPreview: queryText.substring(0, 100) + (queryText.length > 100 ? '...' : ''),
                paramsCount: params.length,
            });
            throw error;
        }
    }

    /**
     * Execute a single row query (returns first row or null)
     * @param query SQL query string
     * @param params Query parameters
     * @param operation Description of the operation for logging
     * @param cacheTtl Cache TTL in milliseconds (optional)
     * @param useCache Whether to use caching for this query (optional)
     */
    protected async executeQuerySingle<T = Record<string, unknown>>(
        query: string,
        params: (string | number | boolean | null)[] = [],
        operation: string,
        cacheTtl?: number,
        useCache?: boolean
    ): Promise<T | null> {
        const results = await this.executeQuery<T>(query, params, operation, cacheTtl, useCache);
        return results.length > 0 ? (results[0] ?? null) : null;
    }

    /**
     * Handle database constraint violations and provide meaningful error messages
     * @param error Database error
     * @param operation Operation being performed
     */
    protected handleDatabaseError(error: unknown, operation: string): never {
        this.logger.error(`Database error in ${this.context} during ${operation}`, error instanceof Error ? error : String(error), {
            errorCode: (error as { code?: string })?.code,
            constraintName: (error as { constraint?: string })?.constraint,
        });

        // Handle common PostgreSQL errors
        const errorCode = (error as { code?: string })?.code;
        if (errorCode === '23505') {
            throw new Error(`Duplicate record: ${operation}`);
        }
        if (errorCode === '23503') {
            throw new Error(`Foreign key constraint violation: ${operation}`);
        }
        if (errorCode === '23502') {
            throw new Error(`Required field missing: ${operation}`);
        }

        // Re-throw original error if not a known constraint violation
        throw error;
    }

    /**
     * Generate a cache key from query and parameters
     * @param queryText SQL query
     * @param params Query parameters
     * @returns Cache key string
     */
    private generateCacheKey(queryText: string, params: (string | number | boolean | null)[]): string {
        const paramsStr = params.map(p => String(p)).join('|');
        return `${this.context}:${queryText.replace(/\s+/g, ' ').trim()}:${paramsStr}`;
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
     * Initialize the repository by ensuring required tables exist
     * This should be called during application startup
     */
    protected async initializeRepository(): Promise<void> {
        try {
            await this.ensureTablesExist();
            this.logger.info(`${this.context} repository initialized successfully`);
        } catch (error) {
            this.logger.error(`Failed to initialize ${this.context} repository`, error instanceof Error ? error : String(error));
            throw error;
        }
    }

    /**
     * Abstract method to be implemented by concrete repositories
     * Should contain the table creation logic specific to each repository
     */
    protected abstract ensureTablesExist(): Promise<void>;

    /**
     * Check if a table exists in the database
     * @param tableName Name of the table to check
     * @returns Promise<boolean> indicating if table exists
     */
    protected async tableExists(tableName: string): Promise<boolean> {
        try {
            const query = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `;

            const result = await this.executeQuerySingle<{ exists: boolean }>(
                query,
                [tableName],
                'checkTableExists',
                undefined,
                false // Don't cache schema queries
            );

            return result?.exists ?? false;
        } catch (error) {
            this.logger.error(`Failed to check if table ${tableName} exists`, error instanceof Error ? error : String(error));
            return false;
        }
    }

    /**
     * Execute a DDL (Data Definition Language) query
     * @param ddlQuery DDL query string
     * @param description Description of the DDL operation
     */
    protected async executeDDL(ddlQuery: string, description: string): Promise<void> {
        try {
            this.logger.debug(`Executing DDL for ${this.context}: ${description}`);

            // Create proper template strings array for Neon
            const templateStringsArray = Object.assign([ddlQuery], { raw: [ddlQuery] }) as TemplateStringsArray;
            await this.sql(templateStringsArray);

            this.logger.info(`DDL completed for ${this.context}: ${description}`);
        } catch (error) {
            this.logger.error(`DDL failed for ${this.context}: ${description}`, error instanceof Error ? error : String(error));
            throw error;
        }
    }
}
