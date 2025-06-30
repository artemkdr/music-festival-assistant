import { z } from 'zod';

// User preferences schema
export const UserPreferencesSchema = z.object({
    comment: z.string().max(500).optional(),
    genres: z.array(z.string()).min(0).max(50).optional(),
    preferredArtists: z.array(z.string()).optional(),
    dislikedArtists: z.array(z.string()).optional(),
    recommendationStyle: z.enum(['conservative', 'balanced', 'adventurous']),
    recommendationsCount: z.number().min(1).max(10),
});

/**
 * Types from schemas
 */
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
