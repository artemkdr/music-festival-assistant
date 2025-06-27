import { IFestivalRepository } from '@/lib/repositories/interfaces';
import { Festival } from '@/lib/schemas';
import { IFestivalCrawlerService } from '@/lib/services/crawler/interfaces';
import type { ILogger } from '@/lib/types/logger';
import { generateFestivalActId, generateFestivalId } from '@/lib/utils/id-generator';

interface GrabFestivalData {
    urls: string[];
    name?: string | undefined; // Optional name, can be used if the crawler does not provide it
    files?:
        | {
              name: string;
              type: string;
              base64: string;
          }[]
        | undefined; // Optional files, can be used for additional data
}

interface CachedData {
    festival: Festival;
    createdAt: Date;
    expiresAt: Date;
}

export interface IFestivalService {
    grabFestivalData(data: GrabFestivalData): Promise<{ cacheId: string; festival: Festival }>;
    getCachedData(cacheId: string): Promise<Festival | null>;
    clearExpiredCache(): void;
    getFestivalById(id: string): Promise<Festival | null>;
    createFestival(festival: Festival): Promise<string>;
    saveFestival(festival: Festival): Promise<void>;
    deleteFestival(id: string): Promise<void>;
    getAllFestivals(): Promise<Festival[]>;
}

export class FestivalService implements IFestivalService {
    private dataCache = new Map<string, CachedData>();
    private readonly CACHE_TTL_HOURS = 24; // Cache expires after 24 hours

    constructor(
        private festivalRepository: IFestivalRepository,
        private festivalCrawlerService: IFestivalCrawlerService,
        private logger: ILogger
    ) {
        // Set up periodic cache cleanup every hour
        setInterval(() => this.clearExpiredCache(), 60 * 60 * 1000);
    }

    async getFestivalById(id: string): Promise<Festival | null> {
        this.logger.info(`Fetching festival with ID: ${id}`);
        return this.festivalRepository.getFestivalById(id);
    }

    async getAllFestivals(): Promise<Festival[]> {
        this.logger.info(`Fetching all festivals`);
        return this.festivalRepository.getAllFestivals();
    }

    async createFestival(data: Festival): Promise<string> {
        this.logger.info(`Creating new festival...`);
        data.id = generateFestivalId({
            name: data.name,
            location: data.location || 'unknown-location',
        });
        const festival = await this.festivalRepository.saveFestival(data);
        return festival.id;
    }

    async grabFestivalData(data: GrabFestivalData): Promise<{ cacheId: string; festival: Festival }> {
        this.logger.info(`Parsing festival data...`);
        const inputs = data.urls;
        if (data.files && data.files.length > 0) {
            inputs.push(...data.files.map(file => file.base64));
        }
        const newFestival = await this.festivalCrawlerService.crawlFestival(inputs);
        newFestival.id = generateFestivalId({
            name: newFestival.name,
            location: newFestival.location || 'unknown-location',
        });
        if (data.name) {
            this.logger.info(`Overriding festival name with provided name: ${data.name}`);
            newFestival.name = data.name;
        }
        // ensure that the festival acts have unique IDs
        newFestival.lineup = newFestival.lineup.map(act => ({
            ...act,
            id: act.id || generateFestivalActId(newFestival.name),
        }));

        // Generate cache ID and store in cache
        const cacheId = this.generateCacheId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.CACHE_TTL_HOURS * 60 * 60 * 1000);

        this.dataCache.set(cacheId, {
            festival: newFestival,
            createdAt: now,
            expiresAt: expiresAt,
        });

        this.logger.info(`Festival data parsed and cached with ID: ${cacheId}`, {
            festivalName: newFestival.name,
            cacheId,
            expiresAt,
        });

        return { cacheId, festival: newFestival };
    }

    async getCachedData(cacheId: string): Promise<Festival | null> {
        this.logger.info(`Retrieving cached festival with ID: ${cacheId}`);

        const cachedData = this.dataCache.get(cacheId);
        if (!cachedData) {
            this.logger.warn(`No cached festival found with ID: ${cacheId}`);
            return null;
        }

        // Check if cache has expired
        if (new Date() > cachedData.expiresAt) {
            this.logger.info(`Cached festival expired, removing from cache: ${cacheId}`);
            this.dataCache.delete(cacheId);
            return null;
        }

        this.logger.info(`Retrieved cached festival: ${cachedData.festival.name}`);
        return cachedData.festival;
    }

    clearExpiredCache(): void {
        const now = new Date();
        let expiredCount = 0;

        for (const [cacheId, cachedData] of this.dataCache.entries()) {
            if (now > cachedData.expiresAt) {
                this.dataCache.delete(cacheId);
                expiredCount++;
            }
        }

        if (expiredCount > 0) {
            this.logger.info(`Cleared ${expiredCount} expired cached festivals`);
        }
    }

    async saveFestival(festival: Festival): Promise<void> {
        this.logger.info(`Saving festival: ${festival.name}`);
        if (!festival.id) {
            this.logger.warn(`Festival ID is missing, generating a new one.`);
            festival.id = generateFestivalId({
                name: festival.name,
                location: festival.location || 'unknown-location',
            });
        }
        // ensure that the festival acts have unique IDs
        festival.lineup = festival.lineup.map(act => ({
            ...act,
            id: act.id || generateFestivalActId(festival.name),
        }));
        await this.festivalRepository.saveFestival(festival);
    }

    async deleteFestival(id: string): Promise<void> {
        this.logger.info(`Deleting festival with ID: ${id}`);
        throw new Error('Festival deletion is not implemented yet');
        //await this.festivalRepository.deleteFestival(id);
    }

    private generateCacheId(): string {
        return `cache_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}
