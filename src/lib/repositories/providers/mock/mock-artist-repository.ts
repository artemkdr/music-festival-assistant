import { IArtistRepository } from '@/lib/repositories/interfaces';
import { Artist } from '@/lib/schemas';
import type { ILogger } from '@/lib/types/logger';
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

    async getArtistsByIds(ids: string[]): Promise<Artist[]> {
        this.logger.debug('Getting artists by IDs', { ids });
        const matchingArtists = this.artists.filter(artist => ids.includes(artist.id));
        this.logger.info('Artist ID-based lookup result', {
            ids,
            foundCount: matchingArtists.length,
        });
        return matchingArtists;
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

    async searchArtistsByName(name: string, exact: boolean = true): Promise<Artist[]> {
        this.logger.debug('Searching artists by name in local storage', { name });
        const searchTerm = name.toLowerCase();
        const matchingArtists = this.artists.filter(artist => (exact ? artist.name.toLowerCase() === searchTerm : artist.name.toLowerCase().includes(searchTerm)));
        this.logger.info('Local name-based artist search result', {
            name,
            foundCount: matchingArtists.length,
        });
        // sort matching artists by macthing score
        // score is the index of the search term in the artist name
        // and the length diff between the search term and the artist name - minimal difference is better
        matchingArtists.sort((a, b) => {
            let aScore = a.name.toLowerCase().indexOf(searchTerm);
            let bScore = b.name.toLowerCase().indexOf(searchTerm);
            if (a.name.length > searchTerm.length) {
                aScore += a.name.length - searchTerm.length;
            }
            if (b.name.length > searchTerm.length) {
                bScore += b.name.length - searchTerm.length;
            }
            // If scores are equal, prefer exact match
            if (aScore === 0 && bScore > 0) return -1;
            if (bScore === 0 && aScore > 0) return 1;
            // Otherwise, sort by score
            return aScore - bScore;
        });
        return matchingArtists;
    }

    async searchArtistByName(name: string): Promise<Artist | null> {
        const artist = await this.searchArtistsByName(name, true);
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

    async deleteArtist(id: string): Promise<void> {
        this.logger.debug('Deleting artist', { artistId: id });
        const index = this.artists.findIndex(a => a.id === id);
        if (index >= 0) {
            this.artists.splice(index, 1);
            this.logger.info('Deleted artist', { artistId: id });
        } else {
            this.logger.warn('Artist not found for deletion', { artistId: id });
        }
    }
}
