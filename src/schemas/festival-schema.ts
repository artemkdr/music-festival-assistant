import { PerformanceSchema } from '@/schemas/performance-schema';
import { UserPreferencesSchema } from '@/schemas/user-preferences-schema';
import { normalizeName } from '@/utils/normalize-name';
import { z } from 'zod';

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
export const FestivalLooseSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    location: z.string().max(200).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    website: z.string().optional(),
    imageUrl: z.string().optional(),
    stages: z.array(z.string()).optional(),
    performances: z.array(
        z.object({
            id: z.string().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
            stage: z.string().optional(),
            day: z.number().optional(),
            artist: z.object({
                name: z.string().min(1).max(200),
            }),
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
}).extend({
    performances: z.array(
        PerformanceSchema.pick({
            id: true,
            startTime: true,
            endTime: true,
            stage: true,
            day: true,
        }).extend({
            artist: z.object({
                name: z.string().min(1).max(200),
                id: z.string().optional(), // Optional for new artists
            }),
        })
    ),
});

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

export const generateFestivalId = (festival: { name: string; location: string; startDate: string; endDate: string }): string => {
    const randomString = Math.random().toString(36).substring(2, 10);
    return `festival-${normalizeName(festival.name)}-${normalizeName(festival.location)}-${randomString}`;
};
