/**
 * User feedback service implementation
 * Handles user interactions and preference learning
 */
import type { UserFeedback, UserPreferences } from '@/types';
import type { IUserFeedbackService } from './interfaces';
import type { IUserFeedbackRepository } from '@/repositories/interfaces';
import type { ILogger } from '@/lib/logger';

/**
 * Service for handling user feedback and preference learning
 */
export class UserFeedbackService implements IUserFeedbackService {
    constructor(
        private feedbackRepository: IUserFeedbackRepository,
        private logger: ILogger
    ) {}

    /**
     * Record user feedback for a recommendation
     * @param feedback User feedback data
     * @returns Promise resolving to saved feedback
     */
    async recordFeedback(feedback: UserFeedback): Promise<UserFeedback> {
        this.logger.info('Recording user feedback', {
            artistId: feedback.artistId,
            rating: feedback.rating,
            sessionId: feedback.sessionId,
        });

        try {
            const savedFeedback = await this.feedbackRepository.saveFeedback(feedback);

            this.logger.debug('Feedback saved successfully', {
                feedbackId: savedFeedback.recommendationId,
            });

            return savedFeedback;
        } catch (error) {
            this.logger.error('Failed to record feedback', error as Error, { feedback });
            throw error;
        }
    }

    /**
     * Get user preferences based on session feedback
     * @param sessionId Session identifier
     * @returns Promise resolving to inferred preferences
     */
    async getInferredPreferences(sessionId: string): Promise<Partial<UserPreferences>> {
        this.logger.info('Inferring preferences from session feedback', { sessionId });

        try {
            const sessionFeedback = await this.feedbackRepository.getFeedbackBySessionId(sessionId);

            if (sessionFeedback.length === 0) {
                this.logger.warn('No feedback found for session', { sessionId });
                return {};
            }

            // Analyze positive feedback to infer preferred genres and artists
            const positiveFeedback = sessionFeedback.filter(f => f.rating === 'like' || f.rating === 'love');

            const negativeFeedback = sessionFeedback.filter(f => f.rating === 'dislike');

            // Extract patterns from feedback
            const inferredPreferences: Partial<UserPreferences> = {
                preferredArtists: this.extractPreferredArtists(positiveFeedback),
                dislikedArtists: this.extractDislikedArtists(negativeFeedback),
            };

            // Infer discovery mode based on feedback patterns
            const discoveryMode = this.inferDiscoveryMode(sessionFeedback);
            if (discoveryMode) {
                inferredPreferences.discoveryMode = discoveryMode;
            }

            this.logger.info('Preferences inferred from session', {
                sessionId,
                feedbackCount: sessionFeedback.length,
                preferredArtists: inferredPreferences.preferredArtists?.length || 0,
                dislikedArtists: inferredPreferences.dislikedArtists?.length || 0,
            });

            return inferredPreferences;
        } catch (error) {
            this.logger.error('Failed to infer preferences', error as Error, { sessionId });
            throw error;
        }
    }

    /**
     * Get feedback analytics for a session
     * @param sessionId Session identifier
     * @returns Promise resolving to feedback analytics
     */
    async getSessionAnalytics(sessionId: string): Promise<{
        totalFeedback: number;
        positiveRatio: number;
        preferredGenres: string[];
        topArtists: string[];
    }> {
        this.logger.info('Generating session analytics', { sessionId });

        try {
            const sessionFeedback = await this.feedbackRepository.getFeedbackBySessionId(sessionId);

            const totalFeedback = sessionFeedback.length;
            const positiveFeedback = sessionFeedback.filter(f => f.rating === 'like' || f.rating === 'love').length;

            const positiveRatio = totalFeedback > 0 ? positiveFeedback / totalFeedback : 0;

            // For this mock implementation, we'll return basic analytics
            // In production, this would analyze artist genres and popularity
            const analytics = {
                totalFeedback,
                positiveRatio,
                preferredGenres: [], // Would be populated with actual genre analysis
                topArtists: this.extractPreferredArtists(sessionFeedback.filter(f => f.rating === 'like' || f.rating === 'love')),
            };

            this.logger.info('Session analytics generated', {
                sessionId,
                ...analytics,
            });

            return analytics;
        } catch (error) {
            this.logger.error('Failed to generate session analytics', error as Error, { sessionId });
            throw error;
        }
    }

    /**
     * Extract preferred artists from positive feedback
     * @param positiveFeedback Array of positive feedback
     * @returns Array of preferred artist IDs
     */
    private extractPreferredArtists(positiveFeedback: UserFeedback[]): string[] {
        const artistCounts = new Map<string, number>();

        positiveFeedback.forEach(feedback => {
            const count = artistCounts.get(feedback.artistId) || 0;
            const weight = feedback.rating === 'love' ? 2 : 1; // Love counts more than like
            artistCounts.set(feedback.artistId, count + weight);
        });

        // Return artists sorted by preference strength
        return Array.from(artistCounts.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([artistId]) => artistId)
            .slice(0, 10); // Top 10 preferred artists
    }

    /**
     * Extract disliked artists from negative feedback
     * @param negativeFeedback Array of negative feedback
     * @returns Array of disliked artist IDs
     */
    private extractDislikedArtists(negativeFeedback: UserFeedback[]): string[] {
        return negativeFeedback.filter(f => f.rating === 'dislike').map(f => f.artistId);
    }

    /**
     * Infer discovery mode from feedback patterns
     * @param sessionFeedback All session feedback
     * @returns Inferred discovery mode or null
     */
    private inferDiscoveryMode(sessionFeedback: UserFeedback[]): 'conservative' | 'balanced' | 'adventurous' | null {
        if (sessionFeedback.length < 5) {
            return null; // Not enough data to infer
        }

        const positiveFeedback = sessionFeedback.filter(f => f.rating === 'like' || f.rating === 'love');

        const positiveRatio = positiveFeedback.length / sessionFeedback.length;

        // High positive ratio suggests conservative preference
        if (positiveRatio > 0.8) {
            return 'conservative';
        }

        // Low positive ratio might suggest they're being adventurous
        if (positiveRatio < 0.3) {
            return 'adventurous';
        }

        return 'balanced';
    }
}
