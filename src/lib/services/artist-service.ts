import { IArtistRepository } from '@/lib/repositories/interfaces';
import { Artist } from '@/lib/schemas';
import { IArtistCrawlerService } from '@/lib/services/crawler/interfaces';
import type { ILogger } from '@/lib/types/logger';
import { generateArtistId } from '@/lib/utils/id-generator';

interface CreateArtistData {
    name: string;
    genre?: string[] | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
    mappingIds?: Record<string, string> | undefined;
    festivalName?: string | undefined;
    festivalUrl?: string | undefined;
}

export interface IArtistService {
    getArtistById(id: string): Promise<Artist | null>;
    getArtistsByIds(ids: string[]): Promise<Artist[]>;
    searchArtistByName(name: string): Promise<Artist | null>;
    searchArtistsByName(name: string): Promise<Artist[]>;
    saveArtist(artist: Artist): Promise<void>;
    createArtist(artistData: CreateArtistData): Promise<Artist>;
    crawlArtistDetails(
        id?: string,
        data?: {
            name?: string;
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

    async getArtistsByIds(ids: string[]): Promise<Artist[]> {
        this.logger.info(`Fetching artists by IDs: ${ids.join(', ')}`);
        return this.repository.getArtistsByIds(ids);
    }

    async searchArtistByName(name: string): Promise<Artist | null> {
        this.logger.info(`Searching artists by name: ${name}`);
        return this.repository.searchArtistByName(name);
    }

    async searchArtistsByName(name: string): Promise<Artist[]> {
        this.logger.info(`Searching artists by name: ${name}`);
        return this.repository.searchArtistsByName(name);
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
            spotifyId: data.mappingIds?.spotify,
            context:
                data.festivalName +
                '\n' +
                (data.festivalUrl
                    ? `Additinal info:\nhttps://www.google.com/search?q=${encodeURIComponent(data.name + ' site:' + data.festivalUrl)}`
                    : data.festivalName
                      ? `Additinal info:\nhttps://www.google.com/search?q=${encodeURIComponent(data.name + ' ' + data.festivalName)}`
                      : ''),
        });
        newArtist.id = generateArtistId();
        return this.repository.saveArtist(newArtist);
    }

    /**
     * Fetches artist details using crawler service.
     * It could be an existing artist or an abstract one.
     * Pass 'id' to fetch existing artist details.
     * If 'id' is not provided, it will use the 'name' from 'data' to search for the artist.
     * @param id
     * @param data
     * @returns artist with enriched data
     */
    async crawlArtistDetails(
        id?: string,
        data?: {
            name?: string;
            context?: string | undefined;
            spotifyId?: string | undefined;
        }
    ): Promise<Artist> {
        let artistName = data?.name;
        // if id is provided, we should fetch the artist to get the artist name
        if (!!id) {
            this.logger.info(`Enriching artist with ID: ${id}`);
            const artist = await this.repository.getArtistById(id);
            if (!artist) {
                throw new Error(`Artist with ID ${id} not found`);
            }
            artistName = artist.name;
        }
        if (!artistName) {
            throw new Error('Artist name is required to crawl details');
        }
        const enrichedArtist = await this.crawler.crawlArtistByName(artistName, {
            spotifyId: data?.spotifyId,
            context: data?.context,
        });
        enrichedArtist.name = artistName; // Ensure we keep the original name
        // if id is provided, we should keep it
        if (id) {
            enrichedArtist.id = id;
        }
        return enrichedArtist;
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
