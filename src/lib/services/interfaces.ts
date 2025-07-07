/**
 * Service interfaces for business logic layer
 * Following clean architecture principles with dependency injection
 */
import type { Artist, CalendarEvent, Festival, Recommendation, UserPreferences } from '@/lib/schemas';

/**
 * Data structure for creating a new artist
 */
export interface CreateArtistData {
    name: string;
    genre?: string[] | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
    mappingIds?: Record<string, string> | undefined;
    festivalName?: string | undefined;
    festivalUrl?: string | undefined;
}

/**
 * Artist service interface
 * Provides methods for managing artists, including CRUD operations and AI-enhanced data enrichment
 */
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

/**
 * Data structure for grabbing festival data
 * Used by the crawler to provide URLs and optional additional data
 */
export interface GrabFestivalData {
    urls: string[];
    name?: string | undefined; // Optional name, can be used if the crawler does not provide it
    files?:
        | {
              name: string;
              type: string;
              base64: string;
          }[]
        | undefined; // Optional files, can be used for additional data
}

/**
 * Festival service interface
 * Provides methods for managing festivals, including data retrieval, caching, and CRUD operations
 */
export interface IFestivalService {
    grabFestivalData(data: GrabFestivalData): Promise<{ cacheId: string; festival: Festival }>;
    getCachedData(cacheId: string): Promise<Festival | null>;
    getFestivalById(id: string): Promise<Festival | null>;
    createFestival(festival: Festival): Promise<string>;
    saveFestival(festival: Festival): Promise<void>;
    deleteFestival(id: string): Promise<void>;
    getAllFestivals(): Promise<Festival[]>;
    updateFestivalAct(festivalId: string, actId: string, updates: { artistId?: string }): Promise<void>;
}

/**
 * Recommendation engine service interface
 */
export interface IRecommendationService {
    /**
     * Generate AI-enhanced recommendations using both traditional and AI approaches
     * @param festival Festival data
     * @param userPreferences User music preferences
     * @returns Promise resolving to array of AI-enhanced recommendations
     */
    generateAIEnhancedRecommendations(festival: Festival, userPreferences: UserPreferences): Promise<Recommendation[]>;
}

/**
 * Calendar integration service interface
 */
export interface ICalendarService {
    /**
     * Generate calendar events for selected acts
     * @param actIds Array of act identifiers
     * @param festivalId Festival identifier
     * @returns Promise resolving to array of calendar events
     */
    generateCalendarEvents(actIds: string[], festivalId: string): Promise<CalendarEvent[]>;

    /**
     * Create iCal format string for calendar import
     * @param events Array of calendar events
     * @returns Promise resolving to iCal formatted string
     */
    createICalFormat(events: CalendarEvent[]): Promise<string>;

    /**
     * Generate Google Calendar URL for event creation
     * @param event Calendar event data
     * @returns Google Calendar creation URL
     */
    generateGoogleCalendarUrl(event: CalendarEvent): string;
}
