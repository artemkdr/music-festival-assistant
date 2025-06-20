/**
 * Core types for the Music Festival Assistant application
 */

/**
 * Represents a music artist performing at a festival
 */
export interface Artist {
    id: string;
    name: string;
    genre: string[];
    description: string;
    imageUrl?: string;
    streamingLinks?: {
        spotify?: string;
        appleMusic?: string;
        youtube?: string;
        soundcloud?: string;
        bandcamp?: string;
    };
    socialLinks?: {
        website?: string;
        instagram?: string;
        twitter?: string;
        facebook?: string;
    };
    popularity: number; // 1-100 scale
}

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
    description: string;
    location: string;
    startDate: string; // ISO string
    endDate: string; // ISO string
    website?: string;
    imageUrl?: string;
    stages: string[];
    performances: Performance[];
}

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
