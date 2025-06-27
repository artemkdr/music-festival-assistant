import { IFestivalRepository } from '@/lib/repositories/interfaces';
import { BaseJsonRepository } from '@/lib/repositories/providers/local/base-json-repository';
import { Festival } from '@/lib/schemas';
import type { ILogger } from '@/lib/types/logger';

/**
 * Local JSON festival repository implementation
 */
export class LocalJsonFestivalRepository extends BaseJsonRepository implements IFestivalRepository {
    private readonly filename = 'festivals.json';

    constructor(logger: ILogger) {
        super(logger, 'festivals');
    }

    async getFestivalById(id: string): Promise<Festival | null> {
        this.logger.debug('Getting festival by ID from local storage', { id });
        const festivals = await this.readJsonFile<Festival>(this.filename);
        const festival = festivals.find(f => f.id === id) ?? null;
        this.logger.info('Local festival lookup result', { id, found: !!festival });
        return festival;
    }

    async getFestivalByUrl(url: string): Promise<Festival | null> {
        this.logger.debug('Getting festival by URL from local storage', { url });
        const festivals = await this.readJsonFile<Festival>(this.filename);
        const festival = festivals.find(f => f.website === url) ?? null;
        this.logger.info('Local festival URL lookup result', { url, found: !!festival });
        return festival;
    }

    async getAllFestivals(): Promise<Festival[]> {
        this.logger.debug('Getting all festivals from local storage');
        const festivals = await this.readJsonFile<Festival>(this.filename);
        this.logger.info('Retrieved all local festivals', { count: festivals.length });
        return festivals;
    }

    async saveFestival(festival: Festival): Promise<Festival> {
        this.logger.debug('Saving festival to local storage', { festivalId: festival.id });
        const festivals = await this.readJsonFile<Festival>(this.filename);
        const existingIndex = festivals.findIndex(f => f.id === festival.id);

        if (existingIndex >= 0) {
            festivals[existingIndex] = festival;
            this.logger.info('Updated existing festival in local storage', { festivalId: festival.id });
        } else {
            festivals.push(festival);
            this.logger.info('Created new festival in local storage', { festivalId: festival.id });
        }

        await this.writeJsonFile(this.filename, festivals);
        return festival;
    }
}
