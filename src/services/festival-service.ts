import { ILogger } from '@/lib/logger';
import { IFestivalRepository } from '@/repositories/interfaces';
import { Festival, generateFestivalId } from '@/schemas';
import { IFestivalCrawlerService } from '@/services/crawler/interfaces';

interface CreateFestivalData {
    urls: string[];
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
        const newFestival = await this.festivalCrawlerService.crawlFestival(data.urls);
        newFestival.id = generateFestivalId({
            name: newFestival.name,
            startDate: newFestival.startDate,
            endDate: newFestival.endDate,
            location: newFestival.location,
        });
        return this.festivalRepository.saveFestival(newFestival);
    }

    async saveFestival(festival: Festival): Promise<void> {
        this.logger.info(`Saving festival: ${festival.name}`);
        if (!festival.id) {
            this.logger.warn(`Festival ID is missing, generating a new one.`);
            festival.id = generateFestivalId({
                name: festival.name,
                startDate: festival.startDate,
                endDate: festival.endDate,
                location: festival.location,
            });
        }
        await this.festivalRepository.saveFestival(festival);
    }

    async deleteFestival(id: string): Promise<void> {
        this.logger.info(`Deleting festival with ID: ${id}`);
        throw new Error('Festival deletion is not implemented yet');
        //await this.festivalRepository.deleteFestival(id);
    }
}
