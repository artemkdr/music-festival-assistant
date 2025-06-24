import { normalizeName } from '@/utils/normalize-name';

import { z } from 'zod';

// Performance schema
export const PerformanceSchema = z.object({
    id: z.string().min(1),
    artist: z.object({
        name: z.string().min(1).max(200),
        id: z.string().min(1),
    }),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    stage: z.string().min(1),
    day: z.number().min(1).max(30),
});

/**
 * Types from schemas
 */
export type Performance = z.infer<typeof PerformanceSchema>;

export const generatePerformanceId = (festivalName: string) => {
    return `performance-${normalizeName(festivalName)}-${Math.random().toString(36).substring(2, 15)}`;
};
