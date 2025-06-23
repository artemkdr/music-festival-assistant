/**
 * Recommendation service implementation
 * Core business logic for generating music recommendations
 */
import type { ILogger } from '@/lib/logger';
import { IMusicalAIService } from '@/services/ai/interfaces';
import type { Festival, Recommendation, UserPreferences } from '@/types';
import type { IRecommendationService } from './interfaces';

/**
 * Recommendation engine implementation using collaborative filtering and content-based approaches
 */
export class RecommendationService implements IRecommendationService {
    constructor(
        private logger: ILogger,
        private aiService: IMusicalAIService
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
            const festivalArtists = festival.performances.map(p => ({
                name: p.artist.name,
                genre: p.artist.genre,
                description: p.artist.description,
            }));

            // Generate AI recommendations
            const aiRecommendations = await this.aiService.generateRecommendations({
                userPreferences: {
                    genres: userPreferences.genres,
                    preferredArtists: userPreferences.preferredArtists || [],
                    dislikedArtists: userPreferences.dislikedArtists || [],
                    discoveryMode: userPreferences.discoveryMode,
                },
                availableArtists: festivalArtists,
            });

            this.logger.info('AI-enhanced recommendations generated', {
                festivalId: festival.id,
                aiRecommendationsCount: Array.isArray(aiRecommendations) ? aiRecommendations.length : 0,
                finalCount: aiRecommendations.length,
            });

            return aiRecommendations;
        } catch (error) {
            this.logger.error('AI recommendation generation failed, falling back to traditional', error instanceof Error ? error : new Error(String(error)));
            throw new Error('AI recommendation generation failed, falling back to traditional recommendations');
        }
    }
}
