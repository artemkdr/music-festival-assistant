/**
 * Core types for the Music Festival Assistant application
 */

/**
 * Represents a music artist performing at a festival
 */
export interface Artist {
    // internal ID for the artist
    id: string;
    name: string;
    genre: string[];
    popularity: number; // 1-100 scale, 0 - unknown
    mappingIds?: Record<string, string>; // e.g. { spotify: 'spotify-artist-id', lastfm: 'lastfm-artist-id' }
    description?: string | undefined;
    imageUrl?: string | undefined;
    streamingLinks?: {
        spotify?: string | undefined;
        appleMusic?: string | undefined;
        youtube?: string | undefined;
        soundcloud?: string | undefined;
        bandcamp?: string | undefined;
    };
    socialLinks?: {
        website?: string | undefined;
        instagram?: string | undefined;
        twitter?: string | undefined;
        facebook?: string | undefined;
    };
}

export const generateArtistId = (): string => {
    return `artist-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
};

/**
 * Represents a performance slot at a festival
 */
export interface Performance {
    id: string;
    artistId: string;
    artist: Artist;
    startTime: string; // ISO string
    endTime: string; // ISO string
    stage: string;
    day: number; // Festival day (1, 2, 3, etc.)
}

/**
 * Represents a music festival
 */
export interface Festival {
    id: string;
    name: string;
    location: string;
    startDate: string; // ISO string
    endDate: string; // ISO string
    stages: string[];
    performances: Performance[];
    description?: string | undefined;
    website?: string;
    imageUrl?: string;
}

export const generateFestivalId = (festival: { name: string; location: string; startDate: string; endDate: string }): string => {
    return `festival-${normalizeName(festival.name)}-${normalizeName(festival.location)}-${new Date(festival.startDate).toISOString().split('T')[0]}`;
};

/**
 * User preferences for music discovery
 */
export interface UserPreferences {
    genres: string[];
    preferredArtists?: string[];
    dislikedArtists?: string[];
    timePreferences?: {
        preferredDays?: number[];
        preferredTimeSlots?: string[]; // 'morning', 'afternoon', 'evening', 'night'
    };
    discoveryMode: 'conservative' | 'balanced' | 'adventurous';
}

/**
 * Festival recommendation based on user preferences
 */
export interface Recommendation {
    artist: Artist;
    performance: Performance;
    score: number; // 0-1 confidence score
    reasons: string[]; // Why this artist is recommended
    similarArtists?: Artist[];
    aiEnhanced?: boolean; // Whether this recommendation was enhanced by AI
    aiTags?: string[]; // AI-generated tags for this recommendation
}

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
 * User feedback on recommendations
 */
export interface UserFeedback {
    recommendationId: string;
    artistId: string;
    rating: 'like' | 'dislike' | 'love' | 'skip';
    sessionId: string;
}

/**
 * Calendar event for adding performances to user calendar
 */
export interface CalendarEvent {
    title: string;
    description: string;
    startTime: string; // ISO string
    endTime: string; // ISO string
    location: string;
    url?: string;
}

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
