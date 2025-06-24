/**
 * Repository interfaces for data access layer
 * Following repository pattern for clean architecture
 */
import type { Artist, Festival, Performance } from '@/schemas';

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
}

/**
 * Performance repository interface
 */
export interface IPerformanceRepository {
    /**
     * Get performances by festival ID
     * @param festivalId Festival identifier
     * @returns Promise resolving to array of performances
     */
    getPerformancesByFestivalId(festivalId: string): Promise<Performance[]>;

    /**
     * Get performances by artist ID
     * @param artistId Artist identifier
     * @returns Promise resolving to array of performances
     */
    getPerformancesByArtistId(artistId: string): Promise<Performance[]>;

    /**
     * Get performances by day
     * @param festivalId Festival identifier
     * @param day Day number
     * @returns Promise resolving to array of performances
     */
    getPerformancesByDay(festivalId: string, day: number): Promise<Performance[]>;

    /**
     * Save performance data
     * @param performance Performance data to save
     * @returns Promise resolving to saved performance
     */
    savePerformance(performance: Performance): Promise<Performance>;
}
