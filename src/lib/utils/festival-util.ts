import { Festival } from "@/lib/schemas";

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
    festival.lineup.forEach(performance => {        
        const artistId = performance.artistId;
        const artistName = performance.artistName;
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
    return artists;
};

/**
 * Extracts stages list from a festival's lineup.
 */
export const getFestivalStages = (festival: Festival): string[] => {
    const stagesSet = new Set<string>();
    festival.lineup.forEach(performance => {        
        if (!!performance.stage) {
            stagesSet.add(performance.stage);
        }
    });
    return Array.from(stagesSet);
};

/**
 * Get start and end dates from a festival's lineup.
 */
export const getFestivalDates = (festival: Festival): { startDate: string | undefined; endDate: string | undefined } => {
    if (!festival.lineup || festival.lineup.length === 0) {
        return { startDate: undefined, endDate: undefined };
    }
    const firstDayPerformance = festival.lineup[0];
    const lastDayPerformance = festival.lineup[festival.lineup.length - 1];
    const startDate = !!firstDayPerformance ? firstDayPerformance.date : undefined;
    const endDate = !!lastDayPerformance ? lastDayPerformance.date : undefined;
    return { startDate, endDate };
};


/**
 * Get performance by artist name in a festival's lineup.
 */
export const getPerformanceByArtistName = (festival: Festival, artistName: string) => {
    return festival.lineup.find(performance => performance.artistName.toLowerCase() === artistName.toLowerCase());
};

/**
 * Is festival finished?
 */
export const isFestivalFinished = (festival: Festival): boolean => {
    const today = new Date();
    const endDate = new Date(getFestivalDates(festival).endDate || '-');
    if (isNaN(endDate.getTime())) {
        return false; // If end date is invalid, we cannot determine if festival is finished
    }
    return endDate < today;
};
