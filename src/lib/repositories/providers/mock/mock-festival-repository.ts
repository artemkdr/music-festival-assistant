import { IFestivalRepository } from '@/lib/repositories/interfaces';
import { Festival } from '@/lib/schemas';
import type { ILogger } from '@/lib/types/logger';
import { mockFestival } from '@/tests/mock-data';

/**
 * Mock festival repository implementation
 */

export class MockFestivalRepository implements IFestivalRepository {
    private festivals: Festival[] = [mockFestival];

    constructor(private logger: ILogger) {}

    async getFestivalById(id: string): Promise<Festival | null> {
        this.logger.debug('Getting festival by ID', { id });
        const festival = this.festivals.find(f => f.id === id) ?? null;
        this.logger.info('Festival lookup result', { id, found: !!festival });
        return festival;
    }

    async getFestivalByUrl(url: string): Promise<Festival | null> {
        this.logger.debug('Getting festival by URL', { url });
        // In real implementation, this would parse the URL and scrape the website
        const festival = this.festivals.find(f => f.website === url) ?? null;
        this.logger.info('Festival URL lookup result', { url, found: !!festival });
        return festival;
    }

    async getAllFestivals(): Promise<Festival[]> {
        this.logger.debug('Getting all festivals');
        this.logger.info('Retrieved all festivals', { count: this.festivals.length });
        return [...this.festivals];
    }

    async saveFestival(festival: Festival): Promise<Festival> {
        this.logger.debug('Saving festival', { festivalId: festival.id });
        const existingIndex = this.festivals.findIndex(f => f.id === festival.id);

        if (existingIndex >= 0) {
            this.festivals[existingIndex] = festival;
            this.logger.info('Updated existing festival', { festivalId: festival.id });
        } else {
            this.festivals.push(festival);
            this.logger.info('Created new festival', { festivalId: festival.id });
        }

        return festival;
    }
}
