import { z } from 'zod';

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

/**
 * Types from schemas
 */
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
