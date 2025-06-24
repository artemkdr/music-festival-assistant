import { z } from 'zod';

// Calendar event schema
export const CalendarEventSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    location: z.string().min(1).max(200),
    url: z.string().url().optional(),
});

/**
 * Types from schemas
 */
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
