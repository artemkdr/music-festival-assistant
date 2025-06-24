/**
 * Zod validation schemas for API endpoints and data validation
 */
import { z } from 'zod';

// Artist schema
export const ArtistSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    genre: z.array(z.string()).optional(),
    description: z.string().max(5000).optional(),
    imageUrl: z.string().url().optional(),
    mappingIds: z
        .object({
            spotify: z.string().optional(),
            appleMusic: z.string().optional(),
            youtube: z.string().optional(),
        })
        .optional(),
    streamingLinks: z
        .object({
            spotify: z.string().url().optional(),
            appleMusic: z.string().url().optional(),
            youtube: z.string().url().optional(),
        })
        .optional(),
    socialLinks: z
        .object({
            website: z.string().url().optional(),
            instagram: z.string().url().optional(),
        })
        .optional(),
    popularity: z
        .object({
            spotify: z
                .object({
                    rating: z.number().min(0).max(100).optional(),
                    monthlyListeners: z.number().min(0).optional(),
                    mostPopularTrack: z
                        .object({
                            name: z.string().min(1).max(200).optional(),
                            listens: z.number().min(0).optional(),
                            url: z.string().url().optional(),
                        })
                        .optional(),
                })
                .optional(),
            appleMusic: z
                .object({
                    rating: z.number().min(0).max(100).optional(),
                })
                .optional(),
        })
        .optional(),
});

// Simplified artist schema for AI responses
export const ArtistShortSchema = ArtistSchema.pick({
    name: true,
});

// Artist update schema (for PUT requests)
export const UpdateArtistSchema = ArtistSchema.pick({
    name: true,
    description: true,
    genre: true,
    imageUrl: true,
    mappingIds: true,
    streamingLinks: true,
    socialLinks: true,
    popularity: true,
});

// Performance schema
export const PerformanceSchema = z.object({
    id: z.string().min(1),
    artistId: z.string().min(1),
    artist: ArtistSchema,
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    stage: z.string().min(1),
    day: z.number().min(1).max(30),
});

// Festival schema
export const FestivalSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    location: z.string().min(1).max(200),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    website: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    stages: z.array(z.string()).min(1),
    performances: z.array(PerformanceSchema),
});

// Simplified festival schema for AI responses
export const FestivalShortSchema = FestivalSchema.pick({
    name: true,
    description: true,
    location: true,
    startDate: true,
    endDate: true,
    website: true,
    imageUrl: true,
    stages: true,
}).extend({
    performances: z.array(
        PerformanceSchema.pick({
            artist: true,
            startTime: true,
            endTime: true,
            stage: true,
            day: true,
        }).extend({
            artist: ArtistShortSchema,
        })
    ),
});

// Festival update schema (for PUT requests)
export const UpdateFestivalSchema = FestivalSchema.pick({
    name: true,
    description: true,
    location: true,
    startDate: true,
    endDate: true,
    website: true,
    imageUrl: true,
    stages: true,
    performances: true,
});

// User preferences schema
export const UserPreferencesSchema = z.object({
    genres: z.array(z.string()).min(1).max(20),
    preferredArtists: z.array(z.string()).optional(),
    dislikedArtists: z.array(z.string()).optional(),
    timePreferences: z
        .object({
            preferredDays: z.array(z.number().min(1).max(10)).optional(),
            preferredTimeSlots: z.array(z.enum(['morning', 'afternoon', 'evening', 'night'])).optional(),
        })
        .optional(),
    discoveryMode: z.enum(['conservative', 'balanced', 'adventurous']),
});

export const RecommendationSchema = z.object({
    artist: ArtistSchema,
    performance: PerformanceSchema,
    score: z.number().min(0).max(1), // Confidence score
    reasons: z.array(z.string()), // Why this artist is recommended
    similarArtists: z.array(ArtistSchema).optional(), // Optional similar artists
    aiEnhanced: z.boolean().default(false), // Whether this recommendation was enhanced by AI
    aiTags: z.array(z.string()).optional(), // AI-generated tags for this recommendation
});

export const RecommendationShortSchema = z.object({
    artistId: z.string().min(1),
    artistName: z.string().min(1).max(200),
    score: z.number().min(0).max(1), // Confidence score
    reasons: z.array(z.string()), // Why this artist is recommended
});

export const RecommentationsAIResponseSchema = z.object({
    recommendations: z.array(RecommendationShortSchema),
});

// Festival discovery request schema
export const FestivalDiscoveryRequestSchema = z.object({
    festivalUrl: z.string().url().optional(),
    festivalId: z.string().optional(),
    userPreferences: UserPreferencesSchema,
});

// Calendar event schema
export const CalendarEventSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    location: z.string().min(1).max(200),
    url: z.string().url().optional(),
});
