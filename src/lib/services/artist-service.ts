import { ILogger } from '@/lib/logger';
import { IArtistRepository } from '@/lib/repositories/interfaces';
import { Artist, generateArtistId } from '@/lib/schemas';
import { IArtistCrawlerService } from '@/lib/services/crawler/interfaces';

interface CreateArtistData {
    name: string;
    genre?: string[];
    description?: string;
    imageUrl?: string;
    mappingIds?: Record<string, string>;
    festivalName?: string;
}

export interface IArtistService {
    getArtistById(id: string): Promise<Artist | null>;
    searchArtistByName(name: string): Promise<Artist | null>;
    searchArtistsByName(name: string): Promise<Artist[]>;
    saveArtist(artist: Artist): Promise<void>;
    createArtist(artistData: CreateArtistData): Promise<Artist>;
    populateArtistDetails(
        id: string,
        data?: {
            context?: string | undefined;
            spotifyId?: string | undefined;
        }
    ): Promise<Artist>;
    deleteArtist(id: string): Promise<void>;
    getAllArtists(): Promise<Artist[]>;
}

export class ArtistService implements IArtistService {
    constructor(
        private readonly repository: IArtistRepository,
        private readonly crawler: IArtistCrawlerService,
        private readonly logger: ILogger
    ) {}

    async getArtistById(id: string): Promise<Artist | null> {
        this.logger.info(`Fetching artist with ID: ${id}`);
        return this.repository.getArtistById(id);
    }

    async searchArtistByName(name: string): Promise<Artist | null> {
        this.logger.info(`Searching artists by name: ${name}`);
        return this.repository.searchArtistByName(name);
    }

    async searchArtistsByName(name: string): Promise<Artist[]> {
        this.logger.info(`Searching artists by name: ${name}`);
        return this.repository.searchArtistsByName(name);
    }

    async populateArtistDetails(
        id: string,
        data?: {
            context?: string | undefined;
            spotifyId?: string | undefined;
        }
    ): Promise<Artist> {
        this.logger.info(`Enriching artist with ID: ${id}`);
        const artist = await this.repository.getArtistById(id);
        if (!artist) {
            throw new Error(`Artist with ID ${id} not found`);
        }
        const enrichedArtist = await this.crawler.crawlArtistByName(artist.name, {
            spotifyId: data?.spotifyId,
            context: data?.context,
        });
        enrichedArtist.name = artist.name; // Ensure we keep the original name
        enrichedArtist.id = artist.id; // Ensure we keep the original ID
        return enrichedArtist;
    }

    async saveArtist(artist: Artist): Promise<void> {
        this.logger.info(`Saving artist: ${artist.name}`);
        if (!artist.id) {
            this.logger.warn(`Artist ID is missing, generating a new one.`);
            artist.id = generateArtistId();
        }
        await this.repository.saveArtist(artist);
    }

    /**
     * Enforces artist id and enriches artist data using AI service.
     * @param artist
     * @returns
     */
    async createArtist(data: CreateArtistData): Promise<Artist> {
        this.logger.info(`Creating new artist: ${data.name}`);
        const newArtist = await this.crawler.crawlArtistByName(data.name, {
            context: data.festivalName,
        });
        newArtist.id = generateArtistId();
        return this.repository.saveArtist(newArtist);
    }

    async deleteArtist(id: string): Promise<void> {
        this.logger.info(`Deleting artist with ID: ${id}`);
        await this.repository.deleteArtist(id);
    }

    async getAllArtists(): Promise<Artist[]> {
        this.logger.info(`Fetching all artists`);
        return this.repository.getAllArtists();
    }
}
