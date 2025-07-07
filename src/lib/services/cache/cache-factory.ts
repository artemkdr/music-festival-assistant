import { ICacheService } from '@/lib/services/cache/interfaces';
import { MemoryCacheService } from '@/lib/services/cache/memory-cache-service';
import { RedisCacheService } from '@/lib/services/cache/redis-cache-service';
import { ILogger } from '@/lib/types/logger';
import { toError } from '@/lib/utils/error-handler';

export class CacheFactory {
    /**
     * Create a cache service instance based on the environment
     */
    static createCacheService(logger: ILogger): ICacheService {
        try {
            if (process.env.CACHE_TYPE === 'redis') {
                return new RedisCacheService(logger);
            }
        } catch (error) {
            logger.error('Failed to create Redis cache service', toError(error));
        }
        // fallback to memory cache
        return new MemoryCacheService(logger);
    }
}
