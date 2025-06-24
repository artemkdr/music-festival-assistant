import { ILogger } from '@/lib/logger';
import { IArtistRepository } from '@/repositories/interfaces';
import { Artist } from '@/schemas';
import { mockArtists } from '@/tests/mock-data';

/**
 * Mock artist repository implementation
 */
export class MockArtistRepository implements IArtistRepository {
    private artists: Artist[] = mockArtists;

    constructor(private logger: ILogger) {}

    async getArtistById(id: string): Promise<Artist | null> {
        this.logger.debug('Getting artist by ID', { id });
        const artist = this.artists.find(a => a.id === id) ?? null;
        this.logger.info('Artist lookup result', { id, found: !!artist });
        return artist;
    }

    async getArtistsByGenres(genres: string[]): Promise<Artist[]> {
        this.logger.debug('Getting artists by genres', { genres });
        const matchingArtists = this.artists.filter(artist =>
            artist.genre?.some(artistGenre => genres.some(userGenre => artistGenre.toLowerCase().includes(userGenre.toLowerCase()) || userGenre.toLowerCase().includes(artistGenre.toLowerCase())))
        );
        this.logger.info('Genre-based artist lookup result', {
            genres,
            foundCount: matchingArtists.length,
        });
        return matchingArtists;
    }

    async searchArtistsByName(name: string): Promise<Artist[]> {
        this.logger.debug('Searching artists by name', { name });
        const searchTerm = name.toLowerCase();
        const matchingArtists = this.artists.filter(artist => artist.name.toLowerCase().includes(searchTerm));
        this.logger.info('Name-based artist search result', {
            name,
            foundCount: matchingArtists.length,
        });
        return matchingArtists;
    }

    async searchArtistByName(name: string): Promise<Artist | null> {
        const artist = await this.searchArtistsByName(name);
        if (artist.length > 0 && artist[0]) {
            return artist[0];
        }
        this.logger.info('No artist found by name', { name });
        return null;
    }

    async getAllArtists(): Promise<Artist[]> {
        this.logger.debug('Getting all artists');
        this.logger.info('Retrieved all artists', { count: this.artists.length });
        return [...this.artists];
    }

    async saveArtist(artist: Artist): Promise<Artist> {
        this.logger.debug('Saving artist', { artistId: artist.id });
        const existingIndex = this.artists.findIndex(a => a.id === artist.id);

        if (existingIndex >= 0) {
            this.artists[existingIndex] = artist;
            this.logger.info('Updated existing artist', { artistId: artist.id });
        } else {
            this.artists.push(artist);
            this.logger.info('Created new artist', { artistId: artist.id });
        }

        return artist;
    }
}
