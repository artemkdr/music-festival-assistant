import { ParserFestival, Festival } from '@/lib/schemas';
import { generateFestivalId, generateFestivalActId } from '@/lib/utils/id-generator';

/**
 * Map ParserFestival to Festival
 */
export const mapParserFestivalToFestival = (data: ParserFestival): Festival => {
    const festival: Festival = {
        id: generateFestivalId({
            name: data.festivalName || 'unknown-festival',
            location: data.festivalLocation || 'unknown-location',
        }),
        name: data.festivalName || 'Unknown Festival',
        location: data.festivalLocation || 'Unknown Location',
        description: data.festivalDescription,
        website: data.festivalWebsite,
        lineup: data.lineup.flatMap(day => {
            return day.list.map(item => ({
                // generate unique ID for each act
                id: generateFestivalActId(data.festivalName || 'unknown-festival'),
                festivalName: data.festivalName || 'Unknown Festival',
                date: day.date,
                artistName: item.artist,
                stage: item.stage,
                time: item.time,
            }));
        }),
    };
    return festival;
};
