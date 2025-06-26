import { normalizeName } from '@/utils/normalize-name';

import { z } from 'zod';

// Performance schema
export const PerformanceSchema = z.object({
    artistName: z.string(),
    festivalId: z.string(),
    festivalName: z.string(),
    date: z.string().optional(),
    time: z.string().optional(),
    stage: z.string().optional(),
});

/**
 * Types from schemas
 */
export type Performance = z.infer<typeof PerformanceSchema>;

export const generatePerformanceId = (festivalName: string) => {
    return `performance-${normalizeName(festivalName)}-${Math.random().toString(36).substring(2, 15)}`;
};
