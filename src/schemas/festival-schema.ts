import { PerformanceSchema } from '@/schemas/performance-schema';
import { ArtistSchema, ArtistShortSchema } from '@/schemas/artist-schema';
import { z } from 'zod';
import { UserPreferencesSchema } from '@/schemas/user-preferences-schema';

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
            id: true,
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
}).extend({
    performances: z.array(
        PerformanceSchema.pick({
            id: true,
            startTime: true,
            endTime: true,
            stage: true,
            day: true,
        }).extend({
            artist: ArtistSchema.pick({
                name: true,
            }).extend({
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
