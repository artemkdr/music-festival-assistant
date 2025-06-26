import { Performance } from '@/schemas';
import { UserPreferencesSchema } from '@/schemas/user-preferences-schema';
import { normalizeName } from '@/utils/normalize-name';
import { z } from 'zod';

// Loose festival schema - for AI parsers
// It matches better the websites structure and allows for more flexibility
export const LooseFestivalSchema = z.object({
    festivalName: z.string().optional(),
    festivalLocation: z.string().optional(),
    festivalDescription: z.string().max(2000).optional(),
    festivalWebsite: z.string().optional(),
    lineup: z.array(
        z.object({
            date: z.string(),
            list: z.array(
                z.object({
                    artist: z.string().min(1),
                    time: z.string().optional(),
                    stage: z.string().optional(),
                })
            ),
        })
    ),
});

export const FestivalSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    location: z.string().min(1).max(200).optional(),
    website: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    lineup: z.array(
        z.object({
            date: z.string().datetime(),
            list: z.array(
                z.object({
                    artistName: z.string().min(1),
                    artistId: z.string().optional(),
                    time: z.string().optional(),
                    stage: z.string().optional(),
                })
            ),
        })
    ),
});

// Festival update schema (for PUT requests)
export const UpdateFestivalSchema = FestivalSchema;

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

// Utilities

/**
 * Generates a unique festival ID based on the festival's name and location.
 * It appends a random string to ensure uniqueness.
 *
 * @param festival - The festival object containing name and location.
 * @returns A unique festival ID string.
 */
export const generateFestivalId = (festival: { name: string; location: string }): string => {
    const randomString = Math.random().toString(36).substring(2, 10);
    return `festival-${normalizeName(festival.name)}-${normalizeName(festival.location)}-${randomString}`;
};

/**
 * Extracts artist names from a festival's lineup.
 */
export const getFestivalArtists = (
    festival: Festival
): {
    name: string;
    id: string | undefined;
}[] => {
    const artists = [] as { name: string; id: string | undefined }[];
    festival.lineup.forEach(day => {
        day.list.forEach(item => {
            const artistId = item.artistId;
            const artistName = item.artistName;
            // check if the artist with defined id is already in the list,
            // if id is not defined, check by name
            if (artists.some(a => (artistId !== undefined ? a.id === artistId : a.name === artistName))) {
                return;
            } else {
                artists.push({
                    name: artistName,
                    id: artistId,
                });
            }
        });
    });
    return artists;
};

/**
 * Extracts stages list from a festival's lineup.
 */
export const getFestivalStages = (festival: Festival): string[] => {
    const stagesSet = new Set<string>();
    festival.lineup.forEach(day => {
        day.list.forEach(item => {
            if (item.stage) {
                stagesSet.add(item.stage);
            }
        });
    });
    return Array.from(stagesSet);
};

/**
 * Get start and end dates from a festival's lineup.
 */
export const getFestivalDates = (festival: Festival): { startDate: string | undefined; endDate: string | undefined } => {
    if (festival.lineup.length === 0) {
        return { startDate: undefined, endDate: undefined };
    }
    const startDate = festival.lineup[0]!.date;
    const endDate = festival.lineup[festival.lineup.length - 1]!.date;
    return { startDate, endDate };
};

/**
 * Get performances for a festival.
 */
export const getFestivalPerformances = (festival: Festival): Performance[] => {
    const performances: Performance[] = [];
    festival.lineup.forEach(day => {
        day.list.forEach(item => {
            performances.push({
                festivalId: festival.id,
                festivalName: festival.name,
                artistName: item.artistName,
                date: day.date,
                time: item.time,
                stage: item.stage,
            });
        });
    });
    return performances;
};

/**
 * Get performance by artist name in a festival's lineup.
 */
export const getPerformanceByArtistName = (festival: Festival, artistName: string): Performance | undefined => {
    for (const day of festival.lineup) {
        for (const item of day.list) {
            if (item.artistName.toLowerCase() === artistName.toLowerCase()) {
                return {
                    festivalId: festival.id,
                    festivalName: festival.name,
                    artistName: item.artistName,
                    date: day.date,
                    time: item.time,
                    stage: item.stage,
                };
            }
        }
    }
    return undefined;
};

/**
 * Is festival finished?
 */
export const isFestivalFinished = (festival: Festival): boolean => {
    const today = new Date();
    const endDate = new Date(festival.lineup[festival.lineup.length - 1]!.date);
    if (isNaN(endDate.getTime())) {
        return false; // If end date is invalid, we cannot determine if festival is finished
    }
    return endDate < today;
};
