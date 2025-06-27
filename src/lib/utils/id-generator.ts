import { normalizeName } from "@/lib/utils/normalize-name";

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
 * Generates a unique performance ID based on the festival name and a random string.
 * @param festivalName - The name of the festival.
 * @returns 
 */
export const generatePerformanceId = (festivalName: string) => {
    return `performance-${normalizeName(festivalName)}-${Math.random().toString(36).substring(2, 15)}`;
};


/**
 * This ID is generated using a random string to ensure uniqueness.
 * @returns A unique artist ID string.
 */
export const generateArtistId = (): string => {
    return `artist-${Math.random().toString(36).substring(2, 15)}`;
};
