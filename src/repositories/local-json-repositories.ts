/**
 * Local JSON file-based repository implementations
 * Stores data as JSON files on disk for persistence
 */
import type { ILogger } from '@/lib/logger';
import type { Artist, Festival, Performance } from '@/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { IArtistRepository, IFestivalRepository, IPerformanceRepository } from './interfaces';

/**
 * Base class for JSON file repositories
 */
abstract class BaseJsonRepository {
    protected readonly dataDir: string;

    constructor(
        protected readonly logger: ILogger,
        dataSubDir: string
    ) {
        this.dataDir = path.join(process.cwd(), 'data', dataSubDir);
    }

    /**
     * Ensure data directory exists
     */
    protected async ensureDataDir(): Promise<void> {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
            this.logger.info('Created data directory', { dir: this.dataDir });
        }
    }

    /**
     * Read JSON file
     */
    protected async readJsonFile<T>(filename: string): Promise<T[]> {
        const filePath = path.join(this.dataDir, filename);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data) as T[];
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                // File doesn't exist, return empty array
                return [];
            }
            throw error;
        }
    }

    /**
     * Write JSON file
     */
    protected async writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
        await this.ensureDataDir();
        const filePath = path.join(this.dataDir, filename);
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, jsonData, 'utf-8');
    }

    /**
     * Generate unique ID
     */
    protected generateId(prefix: string): string {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

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

/**
 * Local JSON artist repository implementation
 */
export class LocalJsonArtistRepository extends BaseJsonRepository implements IArtistRepository {
    private readonly filename = 'artists.json';

    constructor(logger: ILogger) {
        super(logger, 'artists');
    }

    async getArtistById(id: string): Promise<Artist | null> {
        this.logger.debug('Getting artist by ID from local storage', { id });
        const artists = await this.readJsonFile<Artist>(this.filename);
        const artist = artists.find(a => a.id === id) ?? null;
        this.logger.info('Local artist lookup result', { id, found: !!artist });
        return artist;
    }

    async getArtistsByGenres(genres: string[]): Promise<Artist[]> {
        this.logger.debug('Getting artists by genres from local storage', { genres });
        const artists = await this.readJsonFile<Artist>(this.filename);
        const matchingArtists = artists.filter(artist =>
            artist.genre?.some(artistGenre => genres.some(userGenre => artistGenre.toLowerCase().includes(userGenre.toLowerCase()) || userGenre.toLowerCase().includes(artistGenre.toLowerCase())))
        );
        this.logger.info('Local genre-based artist lookup result', {
            genres,
            foundCount: matchingArtists.length,
        });
        return matchingArtists;
    }

    async searchArtistsByName(name: string, exact: boolean = true): Promise<Artist[]> {
        this.logger.debug('Searching artists by name in local storage', { name });
        const searchTerm = name.toLowerCase();
        const artists = await this.readJsonFile<Artist>(this.filename);
        const matchingArtists = artists.filter(artist => (exact ? artist.name.toLowerCase() === searchTerm : artist.name.toLowerCase().includes(searchTerm)));
        this.logger.info('Local name-based artist search result', {
            name,
            foundCount: matchingArtists.length,
        });
        return matchingArtists;
    }

    async searchArtistByName(name: string): Promise<Artist | null> {
        this.logger.debug('Searching artist by name in local storage', { name });
        const artists = await this.searchArtistsByName(name, true);
        if (artists.length > 0 && artists[0]) {
            return artists[0];
        }
        this.logger.info('No artist found by name', { name });
        return null;
    }

    async getAllArtists(): Promise<Artist[]> {
        this.logger.debug('Getting all artists from local storage');
        const artists = await this.readJsonFile<Artist>(this.filename);
        this.logger.info('Retrieved all local artists', { count: artists.length });
        return artists;
    }

    /**
     * Save artist to local storage
     */
    async saveArtist(artist: Artist): Promise<Artist> {
        this.logger.debug('Saving artist to local storage', { artistId: artist.id });
        const artists = await this.readJsonFile<Artist>(this.filename);
        const existingIndex = artists.findIndex(a => a.id === artist.id);

        if (existingIndex >= 0) {
            artists[existingIndex] = artist;
            this.logger.info('Updated existing artist in local storage', { artistId: artist.id });
        } else {
            artists.push(artist);
            this.logger.info('Created new artist in local storage', { artistId: artist.id });
        }

        await this.writeJsonFile(this.filename, artists);
        return artist;
    }
}

/**
 * Local JSON performance repository implementation
 */
export class LocalJsonPerformanceRepository extends BaseJsonRepository implements IPerformanceRepository {
    private readonly filename = 'performances.json';

    constructor(logger: ILogger) {
        super(logger, 'performances');
    }

    async getPerformancesByFestivalId(festivalId: string): Promise<Performance[]> {
        this.logger.debug('Getting performances by festival ID from local storage', { festivalId });
        const performances = await this.readJsonFile<Performance>(this.filename);
        // In the future, we might want to add a festivalId field to Performance
        // For now, we'll use the mock logic or implement based on the festival's performances
        const festivalPerformances = performances.filter(p => {
            // This is a simplified approach - in a real app, you'd have a festivalId field
            this.logger.debug('Checking performance for festival', { performanceId: p.id, festivalId });
            return true; // Return all for now, or implement proper filtering
        });
        this.logger.info('Local festival performances lookup result', {
            festivalId,
            foundCount: festivalPerformances.length,
        });
        return festivalPerformances;
    }

    async getPerformancesByArtistId(artistId: string): Promise<Performance[]> {
        this.logger.debug('Getting performances by artist ID from local storage', { artistId });
        const performances = await this.readJsonFile<Performance>(this.filename);
        const artistPerformances = performances.filter(p => p.artistId === artistId);
        this.logger.info('Local artist performances lookup result', {
            artistId,
            foundCount: artistPerformances.length,
        });
        return artistPerformances;
    }

    async getPerformancesByDay(festivalId: string, day: number): Promise<Performance[]> {
        this.logger.debug('Getting performances by day from local storage', { festivalId, day });
        const performances = await this.readJsonFile<Performance>(this.filename);
        const dayPerformances = performances.filter(p => p.day === day);
        this.logger.info('Local day-based performances lookup result', {
            festivalId,
            day,
            foundCount: dayPerformances.length,
        });
        return dayPerformances;
    }

    /**
     * Save performance to local storage
     */
    async savePerformance(performance: Performance): Promise<Performance> {
        this.logger.debug('Saving performance to local storage', { performanceId: performance.id });
        const performances = await this.readJsonFile<Performance>(this.filename);
        const existingIndex = performances.findIndex(p => p.id === performance.id);

        if (existingIndex >= 0) {
            performances[existingIndex] = performance;
            this.logger.info('Updated existing performance in local storage', { performanceId: performance.id });
        } else {
            performances.push(performance);
            this.logger.info('Created new performance in local storage', { performanceId: performance.id });
        }

        await this.writeJsonFile(this.filename, performances);
        return performance;
    }
}
