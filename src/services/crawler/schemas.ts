import { z } from 'zod';

export const FestivalInfoSchema = z.object({
    name: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    description: z.string().optional(),
});

export type FestivalInfo = z.infer<typeof FestivalInfoSchema>;

export const ParsedLineupDataSchema = z.object({
    artists: z.array(
        z.object({
            name: z.string(),
            genre: z.array(z.string()),
            description: z.string().optional(),
            imageUrl: z.string().url().optional(),
            socialLinks: z
                .object({
                    website: z.string().url().optional(),
                    instagram: z.string().url().optional(),
                    twitter: z.string().url().optional(),
                    facebook: z.string().url().optional(),
                })
                .optional(),
            streamingLinks: z
                .object({
                    spotify: z.string().url().optional(),
                    appleMusic: z.string().url().optional(),
                    youtube: z.string().url().optional(),
                    soundcloud: z.string().url().optional(),
                    bandcamp: z.string().url().optional(),
                })
                .optional(),
        })
    ),
    stages: z.array(z.string()).optional(),
    schedule: z
        .array(
            z.object({
                artistName: z.string(),
                stage: z.string(),
                startTime: z.string(), // ISO string
                endTime: z.string(), // ISO string
                day: z.number().optional(), // Festival day (1, 2, 3, etc.)
            })
        )
        .optional(),
});

export type ParsedLineupData = z.infer<typeof ParsedLineupDataSchema>;
