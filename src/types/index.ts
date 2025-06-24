/**
 * Core types for the Music Festival Assistant application
 */

import { ArtistSchema, CalendarEventSchema, FestivalSchema, PerformanceSchema, RecommendationSchema, UserPreferencesSchema } from '@/schemas';
import { z } from 'zod';

/**
 * Represents a music artist performing at a festival
 */
export type Artist = z.infer<typeof ArtistSchema>;

export const generateArtistId = (): string => {
    return `artist-${Math.random().toString(36).substring(2, 15)}}`;
};

/**
 * Represents a performance slot at a festival
 */
export type Performance = z.infer<typeof PerformanceSchema>;

export const generatePerformanceId = (festivalName: string) => {
    return `performance-${normalizeName(festivalName)}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Represents a music festival
 */
export type Festival = z.infer<typeof FestivalSchema>;

export const generateFestivalId = (festival: { name: string; location: string; startDate: string; endDate: string }): string => {
    return `festival-${normalizeName(festival.name)}-${normalizeName(festival.location)}-${new Date(festival.startDate).toISOString().split('T')[0]}`;
};

/**
 * User preferences for music discovery
 */
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

/**
 * Festival recommendation based on user preferences
 */
export type Recommendation = z.infer<typeof RecommendationSchema>;

/**
 * Festival discovery request
 */
export interface FestivalDiscoveryRequest {
    festivalUrl?: string;
    festivalId?: string;
    userPreferences: UserPreferences;
}

/**
 * Festival discovery response
 */
export interface FestivalDiscoveryResponse {
    festival: Festival;
    recommendations: Recommendation[];
    totalArtists: number;
    totalRecommendations: number;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
    status: 'success' | 'error';
    message: string;
    data?: T;
    errors?: string[];
}

/**
 * Calendar event for adding performances to user calendar
 */
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

/**
 * Utility to normalize names:
 * - Remove diacritics,
 * - Remove special characters,
 * - Convert to lowercase,
 * - Trim whitespace
 * - Replace spaces with '-'
 * @param name Name to normalize
 * @returns Normalized name
 */
export const normalizeName = (name: string) => {
    return name
        .normalize('NFD') // Normalize to decompose diacritics
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
};
