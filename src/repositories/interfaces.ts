/**
 * Repository interfaces for data access layer
 * Following repository pattern for clean architecture
 */
import type { Artist, Festival } from '@/schemas';

/**
 * Festival repository interface
 */
export interface IFestivalRepository {
    /**
     * Get festival by ID
     * @param id Festival identifier
     * @returns Promise resolving to festival or null if not found
     */
    getFestivalById(id: string): Promise<Festival | null>;

    /**
     * Get festival by URL (for web scraping scenarios)
     * @param url Festival website URL
     * @returns Promise resolving to festival or null if not found
     */
    getFestivalByUrl(url: string): Promise<Festival | null>;

    /**
     * Get all available festivals
     * @returns Promise resolving to array of festivals
     */
    getAllFestivals(): Promise<Festival[]>;

    /**
     * Save festival data
     * @param festival Festival data to save
     * @returns Promise resolving to saved festival
     */
    saveFestival(festival: Festival): Promise<Festival>;
}

/**
 * Artist repository interface
 */
export interface IArtistRepository {
    /**
     * Get artist by ID
     * @param id Artist identifier
     * @returns Promise resolving to artist or null if not found
     */
    getArtistById(id: string): Promise<Artist | null>;

    /**
     * Get artists by genre
     * @param genres Array of genre strings
     * @returns Promise resolving to array of matching artists
     */
    getArtistsByGenres(genres: string[]): Promise<Artist[]>;

    /**
     * Search artists by name
     * @param name Artist name to search for
     * @returns Promise resolving to array of matching artists
     */
    searchArtistsByName(name: string): Promise<Artist[]>;

    /**
     * Search artists by name
     * @param name Artist name to search for
     * @returns Promise resolving to array of matching artists
     */
    searchArtistByName(name: string): Promise<Artist | null>;

    /**
     * Get all artists
     * @returns Promise resolving to array of all artists
     */
    getAllArtists(): Promise<Artist[]>;

    /**
     * Save artist data
     * @param artist Artist data to save
     * @returns Promise resolving to saved artist
     */
    saveArtist(artist: Artist): Promise<Artist>;

    /**
     *  Delete artist by ID
     * @param id Artist identifier
     * @returns Promise resolving to void
     */
    deleteArtist(id: string): Promise<void>;
}
