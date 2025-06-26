/**
 * Recommendation service implementation
 * Core business logic for generating music recommendations
 */
import type { ILogger } from '@/lib/logger';
import { IArtistRepository } from '@/repositories/interfaces';
import { Artist, getPerformanceByArtistName, getFestivalArtists, type Festival, type Recommendation, type UserPreferences } from '@/schemas';
import { IMusicalAIService } from '@/services/ai/interfaces';
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
            const festivalArtists = getFestivalArtists(festival);
            const artistsMap: Record<string, Artist> = {};
            const artistInfos = await Promise.all(
                festivalArtists.map(async artist => {
                    const detailedArtist = await this.artistRepository.searchArtistByName(artist.name);
                    if (detailedArtist) {
                        artistsMap[artist.name] = detailedArtist;
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
                    comment: userPreferences.comment,
                    genres: userPreferences.genres,
                    preferredArtists: userPreferences.preferredArtists || [],
                    dislikedArtists: userPreferences.dislikedArtists || [],
                    discoveryMode: userPreferences.discoveryMode,
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
                const artist = artistsMap[rec.artistName];
                const artistName = artist?.name ?? rec.artistName;
                const performance = getPerformanceByArtistName(festival, artistName);
                if (artist && performance) {
                    recommendations.push({
                        artist: artist,
                        performance,
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
