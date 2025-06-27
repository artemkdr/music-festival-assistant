import { FestivalActSchema } from '@/lib/schemas';
import { UserPreferencesSchema } from '@/lib/schemas/user-preferences-schema';
import { z } from 'zod';

// Loose festival schema - for AI parsers
// It matches better the websites structure and allows for more flexibility
export const ParserFestivalSchema = z.object({
    festivalName: z.string().optional(),
    festivalLocation: z.string().optional(),
    festivalDescription: z.string().max(2000).optional(),
    festivalWebsite: z.string().optional(),
    lineup: z.array(
        z.object({
            date: z.string(),
            list: z.array(
                z.object({
                    artist: z.string().min(1),
                    time: z.string().optional(),
                    stage: z.string().optional(),
                })
            ),
        })
    ),
});

export const FestivalSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    location: z.string().min(1).max(200).optional(),
    website: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    lineup: z.array(FestivalActSchema),
});

// Festival update schema (for PUT requests)
export const UpdateFestivalSchema = FestivalSchema;

// Festival discovery request schema
export const FestivalDiscoveryRequestSchema = z.object({
    festivalUrl: z.string().url().optional(),
    festivalId: z.string().optional(),
    userPreferences: UserPreferencesSchema,
});

/**
 * Types from schemas
 */

export type Festival = z.infer<typeof FestivalSchema>;
