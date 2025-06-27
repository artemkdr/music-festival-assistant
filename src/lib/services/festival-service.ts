import { IFestivalRepository } from '@/lib/repositories/interfaces';
import { Festival } from '@/lib/schemas';
import { IFestivalCrawlerService } from '@/lib/services/crawler/interfaces';
import type { ILogger } from '@/lib/types/logger';
import { generateFestivalActId, generateFestivalId } from '@/lib/utils/id-generator';

interface CreateFestivalData {
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

export interface IFestivalService {
    getFestivalById(id: string): Promise<Festival | null>;
    createFestival(data: CreateFestivalData): Promise<Festival>;
    saveFestival(festival: Festival): Promise<void>;
    deleteFestival(id: string): Promise<void>;
    getAllFestivals(): Promise<Festival[]>;
}

export class FestivalService implements IFestivalService {
    constructor(
        private festivalRepository: IFestivalRepository,
        private festivalCrawlerService: IFestivalCrawlerService,
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

    async createFestival(data: CreateFestivalData): Promise<Festival> {
        this.logger.info(`Creating new festival...`);
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
        return this.festivalRepository.saveFestival(newFestival);
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
}
