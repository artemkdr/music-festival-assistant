/**
 * Recommendation service implementation
 * Core business logic for generating music recommendations
 */
import type { ILogger } from '@/lib/logger';
import { IMusicalAIService } from '@/services/ai/interfaces';
import type { Festival, Recommendation, UserPreferences } from '@/types';
import type { IRecommendationService } from './interfaces';
import { IArtistRepository } from '@/repositories/interfaces';

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
            const festivalArtists = await Promise.all(
                festival.performances.map(async p => {
                    const artist = await this.artistRepository.searchArtistByName(p.artist.name);
                    if (artist) {
                        return {
                            id: artist.id,
                            name: artist.name,
                            genre: artist.genre,
                            description: artist.description,
                        };
                    }
                    // Explicitly return null if no artist found
                    return null;
                })
            );

            // Filter out nulls (artists not found)
            const filteredFestivalArtists = festivalArtists.filter(a => a !== null);

            // Generate AI recommendations
            const aiRecommendations = await this.aiService.generateRecommendations({
                userPreferences: {
                    genres: userPreferences.genres,
                    preferredArtists: userPreferences.preferredArtists || [],
                    dislikedArtists: userPreferences.dislikedArtists || [],
                    discoveryMode: userPreferences.discoveryMode,
                },
                availableArtists: filteredFestivalArtists,
            });

            this.logger.info('AI-enhanced recommendations generated', {
                festivalId: festival.id,
                aiRecommendationsCount: Array.isArray(aiRecommendations) ? aiRecommendations.length : 0,
                finalCount: aiRecommendations.length,
            });

            const recommendations: Recommendation[] = [];
            for (const rec of aiRecommendations) {
                const artist = (await this.artistRepository.getArtistById(rec.artistId)) ?? (await this.artistRepository.searchArtistByName(rec.artistName));
                const performance = festival.performances.find(p => p.artist.name.toLowerCase() === artist?.name.toLowerCase());
                if (artist && performance) {
                    recommendations.push({
                        artist: artist,
                        performance: performance,
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
