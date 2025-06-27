import { z } from 'zod';

// Festival Act schema
export const FestivalActSchema = z.object({
    id: z.string().min(1),
    artistName: z.string(),
    artistId: z.string().optional(),
    festivalName: z.string(),
    festivalId: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    stage: z.string().optional(),
});

/**
 * Types from schemas
 */
export type FestivalAct = z.infer<typeof FestivalActSchema>;
