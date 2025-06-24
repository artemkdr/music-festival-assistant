/**
 * Zod validation schemas for API endpoints and data validation
 */
import { z } from 'zod';

// Artist schema
export const ArtistSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    genre: z.array(z.string()).optional(),
    description: z.string().max(5000).optional(),
    imageUrl: z.string().url().optional(),
    mappingIds: z
        .object({
            spotify: z.string().optional(),
            appleMusic: z.string().optional(),
            youtube: z.string().optional(),
        })
        .optional(),
    streamingLinks: z
        .object({
            spotify: z.string().url().optional(),
            appleMusic: z.string().url().optional(),
            youtube: z.string().url().optional(),
        })
        .optional(),
    socialLinks: z
        .object({
            website: z.string().url().optional(),
            instagram: z.string().url().optional(),
        })
        .optional(),
    popularity: z
        .object({
            spotify: z
                .object({
                    rating: z.number().min(0).max(100).optional(),
                    monthlyListeners: z.number().min(0).optional(),
                    mostPopularTrack: z
                        .object({
                            name: z.string().min(1).max(200).optional(),
                            listens: z.number().min(0).optional(),
                            url: z.string().url().optional(),
                        })
                        .optional(),
                })
                .optional(),
            appleMusic: z
                .object({
                    rating: z.number().min(0).max(100).optional(),
                })
                .optional(),
        })
        .optional(),
});

// Simplified artist schema for AI responses
export const ArtistShortSchema = ArtistSchema.pick({
    name: true,
});

// Artist update schema (for PUT requests)
export const UpdateArtistSchema = ArtistSchema.pick({
    name: true,
    description: true,
    genre: true,
    imageUrl: true,
    mappingIds: true,
    streamingLinks: true,
    socialLinks: true,
    popularity: true,
});
