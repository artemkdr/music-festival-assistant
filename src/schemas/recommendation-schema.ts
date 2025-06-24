import { ArtistSchema } from '@/schemas/artist-schema';
import { PerformanceSchema } from '@/schemas/performance-schema';
import { z } from 'zod';

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
