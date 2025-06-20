/**
 * Festival discovery service implementation
 * Main orchestrator for the music discovery workflow
 */
import type {
  FestivalDiscoveryResponse,
  UserPreferences,
  Recommendation,
  Festival
} from '@/types';
import type { IFestivalDiscoveryService } from './interfaces';
import type { IFestivalRepository } from '@/repositories/interfaces';
import type { IRecommendationService } from './interfaces';
import type { ILogger } from '@/lib/logger';

/**
 * Main service for festival discovery and artist recommendations
 */
export class FestivalDiscoveryService implements IFestivalDiscoveryService {
  constructor(
    private festivalRepository: IFestivalRepository,
    private recommendationService: IRecommendationService,
    private logger: ILogger
  ) {}

  /**
   * Discover and recommend artists based on user preferences
   * @param festivalId Festival identifier
   * @param userPreferences User music preferences
   * @returns Promise resolving to discovery response with recommendations
   */
  async discoverArtists(
    festivalId: string,
    userPreferences: UserPreferences
  ): Promise<FestivalDiscoveryResponse> {
    this.logger.info('Starting artist discovery', { 
      festivalId, 
      userGenres: userPreferences.genres,
      discoveryMode: userPreferences.discoveryMode
    });

    try {
      // Get festival data
      const festival = await this.festivalRepository.getFestivalById(festivalId);
      if (!festival) {
        throw new Error(`Festival not found: ${festivalId}`);
      }

      // Generate recommendations
      const recommendations = await this.recommendationService.generateRecommendations(
        festival,
        userPreferences
      );

      // Apply time preferences filter if specified
      const filteredRecommendations = this.applyTimePreferencesFilter(
        recommendations,
        userPreferences
      );

      const response: FestivalDiscoveryResponse = {
        festival,
        recommendations: filteredRecommendations,
        totalArtists: festival.performances.length,
        totalRecommendations: filteredRecommendations.length,
      };

      this.logger.info('Artist discovery completed', {
        festivalId,
        totalArtists: response.totalArtists,
        recommendationCount: response.totalRecommendations,
        avgScore: this.calculateAverageScore(filteredRecommendations)
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to discover artists', error as Error, { festivalId });
      throw error;
    }
  }

  /**
   * Discover artists from festival URL (for web scraping)
   * @param festivalUrl Festival website URL
   * @param userPreferences User music preferences
   * @returns Promise resolving to discovery response with recommendations
   */
  async discoverArtistsFromUrl(
    festivalUrl: string,
    userPreferences: UserPreferences
  ): Promise<FestivalDiscoveryResponse> {
    this.logger.info('Starting artist discovery from URL', { 
      festivalUrl, 
      userGenres: userPreferences.genres 
    });

    try {
      // Try to find existing festival by URL
      let festival = await this.festivalRepository.getFestivalByUrl(festivalUrl);
      
      if (!festival) {
        this.logger.warn('Festival not found by URL, returning mock data for now', { festivalUrl });        // In production, this would trigger web scraping
        // For now, return the mock festival
        const allFestivals = await this.festivalRepository.getAllFestivals();
        festival = allFestivals[0] || null;
        if (!festival) {
          throw new Error('No festivals available');
        }
      }

      // Use the standard discovery process
      return await this.discoverArtists(festival.id, userPreferences);
    } catch (error) {
      this.logger.error('Failed to discover artists from URL', error as Error, { festivalUrl });
      throw error;
    }
  }

  /**
   * Get refined recommendations based on user feedback
   * @param sessionId Session identifier
   * @param userPreferences Updated user preferences
   * @returns Promise resolving to refined recommendations
   */
  async refineRecommendations(
    sessionId: string,
    userPreferences: UserPreferences
  ): Promise<Recommendation[]> {
    this.logger.info('Refining recommendations', { sessionId });

    try {
      // For now, use the first available festival
      // In production, this would track which festival the session is for
      const festivals = await this.festivalRepository.getAllFestivals();
      const festival = festivals[0];
      
      if (!festival) {
        throw new Error('No festival available for refinement');
      }

      // Generate new recommendations with updated preferences
      const recommendations = await this.recommendationService.generateRecommendations(
        festival,
        userPreferences
      );

      this.logger.info('Recommendations refined', {
        sessionId,
        newRecommendationCount: recommendations.length
      });

      return recommendations;
    } catch (error) {
      this.logger.error('Failed to refine recommendations', error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * Apply time preferences filter to recommendations
   * @param recommendations Array of recommendations
   * @param userPreferences User preferences including time constraints
   * @returns Filtered recommendations
   */
  private applyTimePreferencesFilter(
    recommendations: Recommendation[],
    userPreferences: UserPreferences
  ): Recommendation[] {
    if (!userPreferences.timePreferences) {
      return recommendations;
    }

    const { preferredDays, preferredTimeSlots } = userPreferences.timePreferences;

    return recommendations.filter(rec => {
      // Filter by preferred days
      if (preferredDays && preferredDays.length > 0) {
        if (!preferredDays.includes(rec.performance.day)) {
          return false;
        }
      }

      // Filter by preferred time slots
      if (preferredTimeSlots && preferredTimeSlots.length > 0) {
        const timeSlot = this.getTimeSlot(rec.performance.startTime);
        if (!preferredTimeSlots.includes(timeSlot)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Determine time slot from start time
   * @param startTime ISO time string
   * @returns Time slot category
   */
  private getTimeSlot(startTime: string): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date(startTime).getHours();
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Calculate average recommendation score
   * @param recommendations Array of recommendations
   * @returns Average score
   */
  private calculateAverageScore(recommendations: Recommendation[]): number {
    if (recommendations.length === 0) return 0;
    
    const totalScore = recommendations.reduce((sum, rec) => sum + rec.score, 0);
    return totalScore / recommendations.length;
  }
}
