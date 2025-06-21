/**
 * Zod validation schemas for API endpoints and data validation
 */
import { z } from 'zod';

// Artist schema
export const artistSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    genre: z.array(z.string()).min(1),
    description: z.string().max(1000),
    imageUrl: z.string().url().optional(),
    streamingLinks: z
        .object({
            spotify: z.string().url().optional(),
            appleMusic: z.string().url().optional(),
            youtube: z.string().url().optional(),
            soundcloud: z.string().url().optional(),
            bandcamp: z.string().url().optional(),
        })
        .optional(),
    socialLinks: z
        .object({
            website: z.string().url().optional(),
            instagram: z.string().url().optional(),
            twitter: z.string().url().optional(),
            facebook: z.string().url().optional(),
        })
        .optional(),
    popularity: z.object({
        spotify: z.number().min(0).max(100).optional(),
        ai: z.number().min(0).max(100).optional(),
        appleMusic: z.number().min(0).max(100).optional(),
        youtube: z.number().min(0).max(100).optional(),
        soundcloud: z.number().min(0).max(100).optional(),
        bandcamp: z.number().min(0).max(100).optional(),
    }),
});

// Performance schema
export const performanceSchema = z.object({
    id: z.string().min(1),
    artistId: z.string().min(1),
    artist: artistSchema,
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    stage: z.string().min(1),
    day: z.number().min(1).max(30),
});

// Festival schema
export const festivalSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    description: z.string().max(2000),
    location: z.string().min(1).max(200),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    website: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    stages: z.array(z.string()).min(1),
    performances: z.array(performanceSchema),
});

// User preferences schema
export const userPreferencesSchema = z.object({
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

// Festival discovery request schema
export const festivalDiscoveryRequestSchema = z.object({
    festivalUrl: z.string().url().optional(),
    festivalId: z.string().optional(),
    userPreferences: userPreferencesSchema,
});

// User feedback schema
export const userFeedbackSchema = z.object({
    recommendationId: z.string().min(1),
    artistId: z.string().min(1),
    rating: z.enum(['like', 'dislike', 'love', 'skip']),
    sessionId: z.string().min(1),
});

// Calendar event schema
export const calendarEventSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    location: z.string().min(1).max(200),
    url: z.string().url().optional(),
});

// API Response schema
export const apiResponseSchema = <T>(dataSchema: z.ZodType<T>) =>
    z.object({
        status: z.enum(['success', 'error']),
        message: z.string(),
        data: dataSchema.optional(),
        errors: z.array(z.string()).optional(),
    });

// Export type inference helpers
export type ArtistInput = z.infer<typeof artistSchema>;
export type PerformanceInput = z.infer<typeof performanceSchema>;
export type FestivalInput = z.infer<typeof festivalSchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
export type FestivalDiscoveryRequestInput = z.infer<typeof festivalDiscoveryRequestSchema>;
export type UserFeedbackInput = z.infer<typeof userFeedbackSchema>;
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
