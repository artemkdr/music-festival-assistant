import { ICacheService } from '@/lib/services/cache/interfaces';
import { ILogger } from '@/lib/types/logger';

export class MemoryCacheService implements ICacheService {
    private cache: Map<string, { value: unknown; expiresAt: number }>;

    constructor(private readonly logger: ILogger) {
        this.cache = new Map();
        this.logger.info('Memory cache service initialized');
    }

    async has(key: string): Promise<boolean> {
        const cachedItem = this.cache.get(key);
        if (cachedItem) {
            if (cachedItem.expiresAt > Date.now()) {
                return true; // Key exists and is not expired
            } else {
                this.cache.delete(key); // Remove expired item
            }
        }
        return false; // Key does not exist or is expired
    }

    async get<T = unknown>(key: string): Promise<T | null> {
        const cachedItem = this.cache.get(key);
        if (cachedItem && cachedItem.expiresAt > Date.now()) {
            this.logger.debug(`Cache hit for key: ${key}`);
            return cachedItem.value as T;
        }
        return null;
    }

    async set(key: string, value: unknown, ttl: number): Promise<void> {
        const expiresAt = Date.now() + ttl * 1000; // Convert ttl to milliseconds
        this.cache.set(key, { value, expiresAt });
    }

    async delete(key: string): Promise<void> {
        this.logger.debug(`Deleting cache key: ${key}`);
        this.cache.delete(key);
    }

    async invalidatePattern(pattern: string): Promise<void> {
        const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
        this.logger.info(`Invalidating cache keys matching pattern "${pattern}": ${keysToDelete.join(', ')}`);
        for (const key of keysToDelete) {
            this.cache.delete(key);
        }
    }

    async clear(): Promise<void> {
        this.cache.clear();
    }
}
