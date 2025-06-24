import { ArtistSchema } from '@/schemas/artist-schema';
import { z } from 'zod';

// Performance schema
export const PerformanceSchema = z.object({
    id: z.string().min(1),
    artist: ArtistSchema,
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    stage: z.string().min(1),
    day: z.number().min(1).max(30),
});
