/**
 * Shared Zod schemas for AI service responses and structured data extraction
 */
import { z } from 'zod';

/**
 * Schema for artist matching AI responses
 */
export const ArtistMatchingResponseSchema = z.object({
    matchedArtist: z.string().optional(),
    confidence: z.number().min(0).max(1),
    suggestions: z.array(z.string()),
});

/**
 * Schema for individual recommendation items
 */
export const RecommendationItemSchema = z.object({
    artistId: z.string(),
    reason: z.string(),
    confidence: z.number().min(0).max(1),
    tags: z.array(z.string()),
});

/**
 * Schema for AI recommendation responses
 */
export const RecommendationsResponseSchema = z.array(RecommendationItemSchema);

/**
 * Schema for festival information extraction
 */
export const FestivalInfoSchema = z.object({
    name: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
});

/**
 * Schema for parsed lineup data
 */
export const ParsedLineupDataSchema = z.object({
    artists: z.array(
        z.object({
            name: z.string(),
            genre: z.array(z.string()).optional(),
            description: z.string().optional(),
            imageUrl: z.string().optional(),
            socialLinks: z
                .object({
                    website: z.string().optional(),
                    instagram: z.string().optional(),
                    twitter: z.string().optional(),
                    facebook: z.string().optional(),
                })
                .optional(),
            streamingLinks: z
                .object({
                    spotify: z.string().optional(),
                    appleMusic: z.string().optional(),
                    youtube: z.string().optional(),
                    soundcloud: z.string().optional(),
                    bandcamp: z.string().optional(),
                })
                .optional(),
        })
    ),
    stages: z.array(z.string()).optional(),
    schedule: z
        .array(
            z.object({
                artistName: z.string(),
                stage: z.string(),
                startTime: z.string(),
                endTime: z.string(),
                day: z.number().optional(),
            })
        )
        .optional(),
});

/**
 * Type exports for TypeScript
 */
export type ArtistMatchingResponse = z.infer<typeof ArtistMatchingResponseSchema>;
export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;
export type RecommendationsResponse = z.infer<typeof RecommendationsResponseSchema>;
export type FestivalInfo = z.infer<typeof FestivalInfoSchema>;
export type ParsedLineupData = z.infer<typeof ParsedLineupDataSchema>;
