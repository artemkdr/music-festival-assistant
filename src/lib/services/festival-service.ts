import { IFestivalRepository } from '@/lib/repositories/interfaces';
import { Festival } from '@/lib/schemas';
import { ICacheService } from '@/lib/services/cache/interfaces';
import { IFestivalCrawlerService } from '@/lib/services/crawler/interfaces';
import { GrabFestivalData, IFestivalService } from '@/lib/services/interfaces';
import type { ILogger } from '@/lib/types/logger';
import { generateFestivalActId, generateFestivalId } from '@/lib/utils/id-generator';

export class FestivalService implements IFestivalService {
    private readonly CACHE_TTL_HOURS = 24; // Cache expires after 24 hours

    constructor(
        private festivalRepository: IFestivalRepository,
        private festivalCrawlerService: IFestivalCrawlerService,
        private cacheService: ICacheService,
        private logger: ILogger
    ) {}

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

        await this.cacheService.set(cacheId, newFestival, this.CACHE_TTL_HOURS * 60 * 60); // Store in cache for 24 hours

        this.logger.info(`Festival data parsed and cached with ID: ${cacheId}`, {
            festivalName: newFestival.name,
        });

        return { cacheId, festival: newFestival };
    }

    async getCachedData(cacheId: string): Promise<Festival | null> {
        this.logger.info(`Retrieving cached festival with ID: ${cacheId}`);

        const cachedData = await this.cacheService.get<Festival>(cacheId);
        if (!cachedData) {
            this.logger.warn(`No cached festival found with ID: ${cacheId}`);
            return null;
        }

        this.logger.info(`Retrieved cached festival: ${cachedData.name}`);
        return cachedData;
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

    async updateFestivalAct(festivalId: string, actId: string, updates: { artistId?: string }): Promise<void> {
        this.logger.info(`Updating festival act: ${actId} for festival: ${festivalId}`, updates);
        const festival = await this.getFestivalById(festivalId);
        if (!festival) {
            throw new Error(`Festival with ID ${festivalId} not found`);
        }

        const actIndex = festival.lineup.findIndex(act => act.id === actId);
        if (actIndex === -1) {
            throw new Error(`Act with ID ${actId} not found in festival ${festivalId}`);
        }

        const currentAct = festival.lineup[actIndex]!; // Safe because we checked actIndex !== -1

        // Update the act details
        const updatedAct = {
            id: currentAct.id,
            artistName: currentAct.artistName,
            festivalName: currentAct.festivalName,
            artistId: updates.artistId ?? currentAct.artistId,
            festivalId: currentAct.festivalId,
            date: currentAct.date,
            time: currentAct.time,
            stage: currentAct.stage,
        };

        // Replace the old act with the updated act in the lineup
        festival.lineup[actIndex] = updatedAct;

        await this.saveFestival(festival);
    }

    private generateCacheId(): string {
        return `festival-service-cache_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}
