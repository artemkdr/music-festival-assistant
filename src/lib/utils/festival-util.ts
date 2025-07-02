import { Festival } from '@/lib/schemas';

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
    festival.lineup.forEach(act => {
        const artistId = act.artistId;
        const artistName = act.artistName;
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
    festival.lineup.forEach(act => {
        if (!!act.stage) {
            stagesSet.add(act.stage);
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
    const firstDayAct = festival.lineup[0];
    const lastDayAct = festival.lineup[festival.lineup.length - 1];
    const startDate = !!firstDayAct ? firstDayAct.date : undefined;
    const endDate = !!lastDayAct ? lastDayAct.date : undefined;
    return { startDate, endDate };
};

/**
 * Get acts by artist name in a festival's lineup.
 */
export const getActsByArtistName = (festival: Festival, artistName: string) => {
    return festival.lineup.filter(act => act.artistName.toLowerCase() === artistName.toLowerCase());
};

/**
 * Get acts by artist name in a festival's lineup.
 */
export const getActsByArtistId = (festival: Festival, artistId: string) => {
    return festival.lineup.filter(act => act.artistId === artistId);
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

export const DATE_TBA = 'TBA';

/**
 * Groups festival acts by date for display purposes.
 * This maintains backwards compatibility with the old lineup structure.
 */
export const groupFestivalActsByDate = (
    festival: Festival
): Array<{
    date: string;
    list: Array<{
        id: string;
        artistName: string;
        artistId?: string;
        time?: string;
        stage?: string;
    }>;
}> => {
    if (!festival.lineup || festival.lineup.length === 0) {
        return [];
    }

    // Group acts by date
    const groupedByDate = festival.lineup.reduce(
        (acc, act) => {
            const date = act.date || DATE_TBA;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push({
                id: act.id,
                artistName: act.artistName,
                ...(act.artistId && { artistId: act.artistId }),
                ...(act.time && { time: act.time }),
                ...(act.stage && { stage: act.stage }),
            });
            return acc;
        },
        {} as Record<
            string,
            Array<{
                id: string;
                artistName: string;
                artistId?: string;
                time?: string;
                stage?: string;
            }>
        >
    );

    // Convert to array and sort by date
    return Object.entries(groupedByDate)
        .map(([date, list]) => ({ date, list }))
        .sort((a, b) => {
            // Handle 'TBA' dates by putting them last
            if (a.date === DATE_TBA) return 1;
            if (b.date === DATE_TBA) return -1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
};
