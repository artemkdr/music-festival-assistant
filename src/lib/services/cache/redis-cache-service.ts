import 'server-only';
import { Redis } from 'ioredis';
import { ICacheService } from '@/lib/services/cache/interfaces';
import { ILogger } from '@/lib/types/logger';

export class RedisCacheService implements ICacheService {
    private client: Redis;

    constructor(private readonly logger: ILogger) {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            throw new Error('REDIS_URL environment variable is not set');
        }
        this.logger.info('Initializing Redis cache service');
        this.client = new Redis(redisUrl);
    }

    async has(key: string): Promise<boolean> {
        const exists = await this.client.exists(key);
        if (exists === 1) {
            return true; // Key exists
        } else if (exists === 0) {
            return false; // Key does not exist
        } else {
            this.logger.error(`Unexpected response from Redis for key ${key}: ${exists}`);
            return false; // Treat unexpected responses as key not existing
        }
    }

    async get<T = unknown>(key: string): Promise<T | null> {
        const data = await this.client.get(key);
        try {
            this.logger.debug(`Cache hit for key: ${key}`);
            return data ? (JSON.parse(data) as T) : null;
        } catch {
            this.logger.error(`Error parsing JSON from Redis for key ${key}:`);
            return null;
        }
    }

    /**
     *
     * @param key
     * @param value
     * @param ttl - default is 1 hour (3600 seconds)
     */
    async set(key: string, value: unknown, ttl: number = 60 * 60): Promise<void> {
        await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    }

    async delete(key: string): Promise<void> {
        this.logger.debug(`Deleting cache key: ${key}`);
        await this.client.del(key);
    }

    async invalidatePattern(pattern: string): Promise<void> {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            this.logger.info(`Invalidating cache keys matching pattern "${pattern}": ${keys.join(', ')}`);
            await this.client.del(keys);
        }
    }

    async clear(): Promise<void> {
        const keys = await this.client.keys('*');
        if (keys.length > 0) {
            await this.client.del(keys);
        }
    }
}
