import type { ILogger } from '@/lib/logger';
import { ParsedFestivalData } from '@/services/ai/schemas';

export class FestivalDataCleaner {
    constructor(private readonly logger: ILogger) {}

    async validateAndCleanData(rawData: ParsedFestivalData): Promise<ParsedFestivalData> {
        this.logger.debug('Validating and cleaning parsed data', {
            artistCount: rawData.artists.length,
            stageCount: rawData.stages?.length || 0,
        });
        const cleanedArtists = rawData.artists
            .filter(artist => artist.name && artist.name.trim().length > 0)
            .map(artist => ({
                ...artist,
                name: artist.name.trim(),
                genres: artist.genre || ['Unknown'],
            }))
            .filter((artist, index, array) => array.findIndex(a => a.name.toLowerCase() === artist.name.toLowerCase()) === index);
        const cleanedStages = [...new Set(rawData.stages?.filter(stage => stage && stage.trim()) || [])];
        const cleanedSchedule = rawData.schedule?.filter(item => item.artistName) || [];
        return {
            artists: cleanedArtists,
            stages: cleanedStages,
            schedule: cleanedSchedule,
            name: rawData.name.trim(),
            location: rawData.location.trim(),
            startDate: rawData.startDate,
            endDate: rawData.endDate,
            description: rawData.description?.trim() || '',
            website: rawData.website?.trim() || '',
        };
    }
}
