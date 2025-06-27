import { z } from 'zod';

// User preferences schema
export const UserPreferencesSchema = z.object({
    comment: z.string().max(500).optional(),
    genres: z.array(z.string()).min(1).max(100).optional(),
    preferredArtists: z.array(z.string()).optional(),
    dislikedArtists: z.array(z.string()).optional(),
    discoveryMode: z.enum(['conservative', 'balanced', 'adventurous']),
});

/**
 * Types from schemas
 */
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
