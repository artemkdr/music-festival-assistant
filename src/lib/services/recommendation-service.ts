/**
 * Recommendation service implementation
 * Core business logic for generating music recommendations
 */
import { IArtistRepository } from '@/lib/repositories/interfaces';
import { Artist, type Festival, type Recommendation, type UserPreferences } from '@/lib/schemas';
import { IMusicalAIService } from '@/lib/services/ai/interfaces';
import type { ILogger } from '@/lib/types/logger';
import { getActsByArtistId, getActsByArtistName, getFestivalArtists } from '@/lib/utils/festival-util';
import type { IRecommendationService } from './interfaces';

/**
 * Recommendation engine implementation using collaborative filtering and content-based approaches
 */
export class RecommendationService implements IRecommendationService {
    constructor(
        private logger: ILogger,
        private aiService: IMusicalAIService,
        private artistRepository: IArtistRepository
    ) {}

    /**
     * Generate AI-enhanced recommendations using both traditional and AI approaches
     * @param festival Festival data
     * @param userPreferences User music preferences
     * @returns Promise resolving to array of recommendations
     */
    async generateAIEnhancedRecommendations(festival: Festival, userPreferences: UserPreferences): Promise<Recommendation[]> {
        this.logger.info('Generating AI-enhanced recommendations', {
            festivalId: festival.id,
            userGenres: userPreferences.genres,
        });

        try {
            // Prepare data for AI processing
            const festivalArtists = getFestivalArtists(festival, userPreferences.date);
            if (userPreferences.date && festivalArtists.length === 0) {
                this.logger.error('No artists found for the specified date');
                throw new Error(`No artists found for the specified date: ${userPreferences.date}`);
            }
            const artistsMap: Record<string, Artist> = {};
            const artistInfos = await Promise.all(
                festivalArtists.map(async artist => {
                    const detailedArtist = artist.id ? await this.artistRepository.getArtistById(artist.id) : await this.artistRepository.searchArtistByName(artist.name);
                    if (detailedArtist) {
                        artistsMap[artist.name.toLowerCase()] = detailedArtist;
                    }
                    return {
                        festivalName: festival.name,
                        name: detailedArtist?.name || artist.name,
                        genre: detailedArtist?.genre || undefined,
                        description: detailedArtist?.description || undefined,
                    };
                })
            );

            // Generate AI recommendations
            const aiRecommendations = await this.aiService.generateRecommendations({
                userPreferences: {
                    language: userPreferences.language || 'en', // Default to English if not specified
                    comment: userPreferences.comment,
                    genres: userPreferences.genres,
                    preferredArtists: userPreferences.preferredArtists || [],
                    dislikedArtists: userPreferences.dislikedArtists || [],
                    recommendationStyle: userPreferences.recommendationStyle,
                    recommendationsCount: userPreferences.recommendationsCount || 5, // Default to 5 if not specified
                },
                availableArtists: artistInfos,
            });

            this.logger.info('AI-enhanced recommendations generated', {
                festivalId: festival.id,
                aiRecommendationsCount: Array.isArray(aiRecommendations) ? aiRecommendations.length : 0,
                finalCount: aiRecommendations.length,
            });

            const recommendations: Recommendation[] = [];
            for (const rec of aiRecommendations) {
                const artist = artistsMap[rec.artistName.toLowerCase()];
                const artistName = artist?.name ?? rec.artistName;
                const acts = artist?.id ? getActsByArtistId(festival, artist.id) : getActsByArtistName(festival, artistName);
                // find the best matching act based on the date
                let act = acts.length > 0 ? acts[0] : null;
                if (userPreferences.date) {
                    if (acts.length > 0) {
                        act = acts.find(a => a.date === userPreferences.date);
                    }
                } else if (acts.length > 0) {
                    // If no date is specified, check at least if there is a date in future
                    const futureActs = acts.filter(a => a.date && new Date(a.date) >= new Date());
                    if (futureActs.length > 0) {
                        act = futureActs[0]; // Take the first future act
                    } else {
                        act = acts[0]; // Fallback to the first act if no future acts are found
                    }
                }
                if (act) {
                    recommendations.push({
                        artist: artist || {
                            id: '', // Fallback if artist not found
                            name: artistName,
                        },
                        act,
                        score: rec.score,
                        reasons: rec.reasons,
                        aiEnhanced: true,
                    });
                }
            }
            return recommendations;
        } catch (error) {
            this.logger.error('AI recommendation generation failed, falling back to traditional', error instanceof Error ? error : new Error(String(error)));
            throw new Error('AI recommendation generation failed, falling back to traditional recommendations');
        }
    }
}
