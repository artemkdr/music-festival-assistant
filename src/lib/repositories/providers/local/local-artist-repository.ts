import { IArtistRepository } from '@/lib/repositories/interfaces';
import { BaseJsonRepository } from '@/lib/repositories/providers/local/base-json-repository';
import { Artist } from '@/lib/schemas';
import type { ILogger } from '@/lib/types/logger';

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

    /**
     * Delete artist from local storage
     * @param id Artist identifier
     */
    async deleteArtist(id: string): Promise<void> {
        this.logger.debug('Deleting artist from local storage', { artistId: id });
        const artists = await this.readJsonFile<Artist>(this.filename);
        const index = artists.findIndex(a => a.id === id);

        if (index >= 0) {
            artists.splice(index, 1);
            await this.writeJsonFile(this.filename, artists);
            this.logger.info('Deleted artist from local storage', { artistId: id });
        } else {
            this.logger.warn('Artist not found for deletion', { artistId: id });
        }
    }
}
