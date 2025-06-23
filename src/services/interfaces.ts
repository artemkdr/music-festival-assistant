/**
 * Service interfaces for business logic layer
 * Following clean architecture principles with dependency injection
 */
import type { CalendarEvent, Festival, Recommendation, UserPreferences } from '@/types';

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
     * Generate calendar events for selected performances
     * @param performanceIds Array of performance identifiers
     * @param festivalId Festival identifier
     * @returns Promise resolving to array of calendar events
     */
    generateCalendarEvents(performanceIds: string[], festivalId: string): Promise<CalendarEvent[]>;

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
