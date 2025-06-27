import { ArtistSchema } from '@/lib/schemas/artist-schema';
import { z } from 'zod';

export const RecommendationSchema = z.object({
    artist: ArtistSchema,
    act: z.object({
        id: z.string().min(1), // Unique identifier for the act
        artistName: z.string().min(1).max(200), // Name of the artist
        date: z.string().optional(), // Optional act date
        time: z.string().optional(), // Optional act time
        stage: z.string().optional(), // Optional stage/venue
    }),
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

/**
 * Types from schemas
 */
export type Recommendation = z.infer<typeof RecommendationSchema>;
