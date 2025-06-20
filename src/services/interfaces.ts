/**
 * Service interfaces for business logic layer
 * Following clean architecture principles with dependency injection
 */
import type { 
  Festival, 
  UserPreferences, 
  Recommendation, 
  FestivalDiscoveryResponse,
  UserFeedback,
  CalendarEvent
} from '@/types';

/**
 * Festival discovery service interface
 */
export interface IFestivalDiscoveryService {
  /**
   * Discover and recommend artists based on user preferences
   * @param festivalId Festival identifier
   * @param userPreferences User music preferences
   * @returns Promise resolving to discovery response with recommendations
   */
  discoverArtists(
    festivalId: string, 
    userPreferences: UserPreferences
  ): Promise<FestivalDiscoveryResponse>;

  /**
   * Discover artists from festival URL (for web scraping)
   * @param festivalUrl Festival website URL
   * @param userPreferences User music preferences
   * @returns Promise resolving to discovery response with recommendations
   */
  discoverArtistsFromUrl(
    festivalUrl: string, 
    userPreferences: UserPreferences
  ): Promise<FestivalDiscoveryResponse>;

  /**
   * Get refined recommendations based on user feedback
   * @param sessionId Session identifier
   * @param userPreferences Updated user preferences
   * @returns Promise resolving to refined recommendations
   */
  refineRecommendations(
    sessionId: string,
    userPreferences: UserPreferences
  ): Promise<Recommendation[]>;
}

/**
 * Recommendation engine service interface
 */
export interface IRecommendationService {
  /**
   * Generate recommendations for a festival based on user preferences
   * @param festival Festival data
   * @param userPreferences User music preferences
   * @returns Promise resolving to array of recommendations
   */
  generateRecommendations(
    festival: Festival, 
    userPreferences: UserPreferences
  ): Promise<Recommendation[]>;

  /**
   * Calculate similarity score between user preferences and artist
   * @param userPreferences User music preferences
   * @param artistId Artist identifier
   * @returns Promise resolving to similarity score (0-1)
   */
  calculateArtistScore(
    userPreferences: UserPreferences, 
    artistId: string
  ): Promise<number>;

  /**
   * Get similar artists to a given artist
   * @param artistId Artist identifier
   * @param limit Maximum number of similar artists to return
   * @returns Promise resolving to array of similar artists
   */
  getSimilarArtists(artistId: string, limit?: number): Promise<string[]>;
}

/**
 * User feedback service interface
 */
export interface IUserFeedbackService {
  /**
   * Record user feedback for a recommendation
   * @param feedback User feedback data
   * @returns Promise resolving to saved feedback
   */
  recordFeedback(feedback: UserFeedback): Promise<UserFeedback>;

  /**
   * Get user preferences based on session feedback
   * @param sessionId Session identifier
   * @returns Promise resolving to inferred preferences
   */
  getInferredPreferences(sessionId: string): Promise<Partial<UserPreferences>>;

  /**
   * Get feedback analytics for a session
   * @param sessionId Session identifier
   * @returns Promise resolving to feedback analytics
   */
  getSessionAnalytics(sessionId: string): Promise<{
    totalFeedback: number;
    positiveRatio: number;
    preferredGenres: string[];
    topArtists: string[];
  }>;
}

/**
 * Calendar integration service interface
 */
export interface ICalendarService {
  /**
   * Generate calendar events for selected performances
   * @param performanceIds Array of performance identifiers
   * @param festivalId Festival identifier
   * @returns Promise resolving to array of calendar events
   */
  generateCalendarEvents(
    performanceIds: string[], 
    festivalId: string
  ): Promise<CalendarEvent[]>;

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

/**
 * External API service interface (for future integration)
 */
export interface IExternalApiService {
  /**
   * Parse festival data from website URL
   * @param url Festival website URL
   * @returns Promise resolving to parsed festival data
   */
  parseFestivalFromUrl(url: string): Promise<Festival>;

  /**
   * Get artist information from Spotify
   * @param artistName Artist name to search for
   * @returns Promise resolving to enhanced artist data
   */
  getSpotifyArtistData(artistName: string): Promise<{
    id: string;
    popularity: number;
    genres: string[];
    imageUrl?: string;
    previewUrl?: string;
  } | null>;

  /**
   * Get similar artists from music recommendation APIs
   * @param artistName Artist name
   * @returns Promise resolving to array of similar artist names
   */
  getSimilarArtistsFromApi(artistName: string): Promise<string[]>;
}
