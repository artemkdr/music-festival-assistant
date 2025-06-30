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
    imageUrl: z.string().optional(),
    mappingIds: z
        .object({
            spotify: z.string().optional(),
            appleMusic: z.string().optional(),
            youtube: z.string().optional(),
        })
        .optional(),
    streamingLinks: z
        .object({
            spotify: z.string().optional(),
            appleMusic: z.string().optional(),
            youtube: z.string().optional(),
            soundcloud: z.string().optional(),
        })
        .optional(),
    socialLinks: z
        .object({
            website: z.string().optional(),
            instagram: z.string().optional(),
        })
        .optional(),
    sources: z.array(z.string()).optional(), // Sources where the artist was found
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
                            url: z.string().optional(),
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

/**
 * Types from schemas
 */
export type Artist = z.infer<typeof ArtistSchema>;
