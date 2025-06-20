/**
 * Recommendation service implementation
 * Core business logic for generating music recommendations
 */
import type { ILogger } from '@/lib/logger';
import type { IArtistRepository, IPerformanceRepository } from '@/repositories/interfaces';
import type { Artist, Festival, Recommendation, UserPreferences } from '@/types';
import type { IRecommendationService } from './interfaces';
import type { IAIService } from '@/services/ai';

/**
 * Recommendation engine implementation using collaborative filtering and content-based approaches
 */
export class RecommendationService implements IRecommendationService {
    constructor(
        private artistRepository: IArtistRepository,
        private performanceRepository: IPerformanceRepository,
        private logger: ILogger,
        private aiService?: IAIService | null
    ) {}

    /**
     * Generate recommendations for a festival based on user preferences
     * @param festival Festival data
     * @param userPreferences User music preferences
     * @returns Promise resolving to array of recommendations
     */
    async generateRecommendations(festival: Festival, userPreferences: UserPreferences): Promise<Recommendation[]> {
        this.logger.info('Generating recommendations', {
            festivalId: festival.id,
            userGenres: userPreferences.genres,
        });

        const recommendations: Recommendation[] = [];

        // Get all performances for the festival
        const performances = await this.performanceRepository.getPerformancesByFestivalId(festival.id);

        for (const performance of performances) {
            const score = await this.calculateArtistScore(userPreferences, performance.artistId);

            if (score > 0.1) {
                // Only recommend artists with a meaningful score
                const reasons = await this.generateRecommendationReasons(userPreferences, performance.artist);

                const similarArtists = await this.getSimilarArtistsObjects(performance.artistId);

                recommendations.push({
                    artist: performance.artist,
                    performance,
                    score,
                    reasons,
                    similarArtists,
                });
            }
        }

        // Sort by score (highest first) and apply discovery mode filtering
        const sortedRecommendations = recommendations.sort((a, b) => b.score - a.score).slice(0, this.getMaxRecommendations(userPreferences.discoveryMode));

        this.logger.info('Recommendations generated', {
            festivalId: festival.id,
            totalPerformances: performances.length,
            recommendationCount: sortedRecommendations.length,
        });

        return sortedRecommendations;
    }

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
            aiEnabled: !!this.aiService,
        });

        // Get traditional recommendations first
        const traditionalRecommendations = await this.generateRecommendations(festival, userPreferences);

        // If AI service is not available, return traditional recommendations
        if (!this.aiService) {
            this.logger.info('AI service not available, using traditional recommendations');
            return traditionalRecommendations;
        }

        try {
            // Prepare data for AI processing
            const festivalArtists = festival.performances.map(p => ({
                id: p.artist.id,
                name: p.artist.name,
                genres: p.artist.genre,
                popularity: p.artist.popularity,
                description: p.artist.description,
                performance: {
                    stage: p.stage,
                    startTime: p.startTime,
                    endTime: p.endTime,
                }
            }));

            // Generate AI recommendations
            const aiRecommendations = await this.aiService.generateRecommendations({
                prompt: `Generate personalized music recommendations for a festival`,
                userPreferences: {
                    genres: userPreferences.genres,
                    preferredArtists: userPreferences.preferredArtists || [],
                    dislikedArtists: userPreferences.dislikedArtists || [],
                    discoveryMode: userPreferences.discoveryMode,
                    timePreferences: userPreferences.timePreferences,
                },
                availableArtists: festivalArtists,
            });

            // Merge AI recommendations with traditional ones
            const enhancedRecommendations = await this.mergeAIRecommendations(
                traditionalRecommendations,
                aiRecommendations,
                festival
            );

            this.logger.info('AI-enhanced recommendations generated', {
                festivalId: festival.id,
                traditionalCount: traditionalRecommendations.length,
                aiRecommendationsCount: Array.isArray(aiRecommendations) ? aiRecommendations.length : 0,
                finalCount: enhancedRecommendations.length,
            });

            return enhancedRecommendations;
        } catch (error) {
            this.logger.error('AI recommendation generation failed, falling back to traditional', 
                error instanceof Error ? error : new Error(String(error)));
            return traditionalRecommendations;
        }
    }

    /**
     * Merge AI-generated recommendations with traditional ones
     */
    private async mergeAIRecommendations(
        traditionalRecommendations: Recommendation[],
        aiRecommendations: unknown,
        festival: Festival
    ): Promise<Recommendation[]> {
        if (!Array.isArray(aiRecommendations)) {
            return traditionalRecommendations;
        }

        const mergedRecommendations = [...traditionalRecommendations];
        const existingArtistIds = new Set(traditionalRecommendations.map(r => r.artist.id));

        for (const aiRec of aiRecommendations) {
            if (typeof aiRec === 'object' && aiRec && 'artistId' in aiRec) {
                const aiRecObj = aiRec as { artistId: string; reason?: string; confidence?: number; tags?: string[] };
                
                if (!existingArtistIds.has(aiRecObj.artistId)) {
                    // Find the performance for this artist
                    const performance = festival.performances.find(p => p.artist.id === aiRecObj.artistId);
                    
                    if (performance) {
                        // Create AI-enhanced recommendation
                        const enhancedRecommendation: Recommendation = {
                            artist: performance.artist,
                            performance,
                            score: (aiRecObj.confidence || 0.5) * 0.9, // Slightly lower than traditional to balance
                            reasons: aiRecObj.reason ? [aiRecObj.reason] : ['AI-recommended based on your preferences'],
                            similarArtists: await this.getSimilarArtistsObjects(performance.artist.id),
                            aiEnhanced: true,
                            aiTags: aiRecObj.tags || [],
                        };

                        mergedRecommendations.push(enhancedRecommendation);
                        existingArtistIds.add(aiRecObj.artistId);
                    }
                }
            }
        }

        // Sort merged recommendations by score
        return mergedRecommendations.sort((a, b) => b.score - a.score);
    }

    /**
     * Calculate similarity score between user preferences and artist
     * @param userPreferences User music preferences
     * @param artistId Artist identifier
     * @returns Promise resolving to similarity score (0-1)
     */
    async calculateArtistScore(userPreferences: UserPreferences, artistId: string): Promise<number> {
        const artist = await this.artistRepository.getArtistById(artistId);
        if (!artist) {
            this.logger.warn('Artist not found for scoring', { artistId });
            return 0;
        }

        let score = 0;
        const weights = {
            genreMatch: 0.4,
            popularity: 0.2,
            preferredArtists: 0.3,
            dislikedArtists: -0.5, // Negative weight for disliked artists
            discoveryMode: 0.1,
        };

        // Genre matching score
        const genreScore = this.calculateGenreScore(userPreferences.genres, artist.genre);
        score += genreScore * weights.genreMatch;

        // Popularity score (normalized)
        const popularityScore = artist.popularity / 100;
        score += popularityScore * weights.popularity;

        // Preferred artists boost
        if (userPreferences.preferredArtists?.includes(artist.name)) {
            score += weights.preferredArtists;
        }

        // Disliked artists penalty
        if (userPreferences.dislikedArtists?.includes(artist.name)) {
            score += weights.dislikedArtists; // This is negative
        }

        // Discovery mode adjustment
        const discoveryBonus = this.getDiscoveryModeBonus(userPreferences.discoveryMode, artist.popularity);
        score += discoveryBonus * weights.discoveryMode;

        // Ensure score is between 0 and 1
        const finalScore = Math.max(0, Math.min(1, score));

        this.logger.debug('Artist score calculated', {
            artistId,
            artistName: artist.name,
            genreScore,
            popularityScore,
            finalScore,
        });

        return finalScore;
    }

    /**
     * Get similar artists to a given artist
     * @param artistId Artist identifier
     * @param limit Maximum number of similar artists to return
     * @returns Promise resolving to array of similar artist IDs
     */
    async getSimilarArtists(artistId: string, limit = 3): Promise<string[]> {
        const artist = await this.artistRepository.getArtistById(artistId);
        if (!artist) {
            return [];
        }

        // Find artists with similar genres
        const similarArtists = await this.artistRepository.getArtistsByGenres(artist.genre);

        return similarArtists
            .filter(a => a.id !== artistId) // Exclude the original artist
            .sort((a, b) => {
                // Sort by genre overlap and popularity
                const aGenreOverlap = this.calculateGenreScore(artist.genre, a.genre);
                const bGenreOverlap = this.calculateGenreScore(artist.genre, b.genre);

                if (aGenreOverlap !== bGenreOverlap) {
                    return bGenreOverlap - aGenreOverlap;
                }

                return b.popularity - a.popularity;
            })
            .slice(0, limit)
            .map(a => a.id);
    }

    /**
     * Calculate genre similarity score
     * @param userGenres User preferred genres
     * @param artistGenres Artist's genres
     * @returns Similarity score (0-1)
     */
    private calculateGenreScore(userGenres: string[], artistGenres: string[]): number {
        if (userGenres.length === 0 || artistGenres.length === 0) {
            return 0;
        }

        let matches = 0;
        for (const userGenre of userGenres) {
            for (const artistGenre of artistGenres) {
                if (this.genresMatch(userGenre, artistGenre)) {
                    matches++;
                }
            }
        }

        // Calculate score based on matches relative to user preferences
        return matches / userGenres.length;
    }

    /**
     * Check if two genres match (fuzzy matching)
     * @param genre1 First genre
     * @param genre2 Second genre
     * @returns True if genres match
     */
    private genresMatch(genre1: string, genre2: string): boolean {
        const g1 = genre1.toLowerCase();
        const g2 = genre2.toLowerCase();

        // Exact match
        if (g1 === g2) return true;

        // Contains match
        if (g1.includes(g2) || g2.includes(g1)) return true;

        // Special genre relationships
        const genreRelations: Record<string, string[]> = {
            electronic: ['house', 'techno', 'ambient', 'garage'],
            rock: ['alternative', 'indie'],
            pop: ['indie pop', 'art pop'],
        };

        for (const [parent, children] of Object.entries(genreRelations)) {
            if ((g1.includes(parent) && children.some(child => g2.includes(child))) || (g2.includes(parent) && children.some(child => g1.includes(child)))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get discovery mode bonus based on artist popularity
     * @param discoveryMode User's discovery preference
     * @param popularity Artist popularity (1-100)
     * @returns Discovery bonus score
     */
    private getDiscoveryModeBonus(discoveryMode: string, popularity: number): number {
        switch (discoveryMode) {
            case 'conservative':
                // Prefer popular artists
                return popularity > 80 ? 0.2 : 0;
            case 'adventurous':
                // Prefer less popular artists for discovery
                return popularity < 50 ? 0.3 : -0.1;
            case 'balanced':
            default:
                // No strong preference
                return 0;
        }
    }

    /**
     * Get maximum number of recommendations based on discovery mode
     * @param discoveryMode User's discovery preference
     * @returns Maximum number of recommendations
     */
    private getMaxRecommendations(discoveryMode: string): number {
        switch (discoveryMode) {
            case 'conservative':
                return 5; // Fewer, higher-confidence recommendations
            case 'adventurous':
                return 15; // More recommendations for exploration
            case 'balanced':
            default:
                return 10; // Balanced approach
        }
    }

    /**
     * Generate reasons for why an artist is recommended
     * @param userPreferences User preferences
     * @param artist Artist data
     * @returns Array of recommendation reasons
     */
    private async generateRecommendationReasons(userPreferences: UserPreferences, artist: Artist): Promise<string[]> {
        const reasons: string[] = [];

        // Genre matches
        const matchingGenres = artist.genre.filter(genre => userPreferences.genres.some(userGenre => this.genresMatch(userGenre, genre)));

        if (matchingGenres.length > 0) {
            reasons.push(`Matches your taste in ${matchingGenres.join(', ')}`);
        }

        // Popularity-based reasons
        if (artist.popularity > 90) {
            reasons.push('Highly popular and critically acclaimed');
        } else if (artist.popularity < 50 && userPreferences.discoveryMode === 'adventurous') {
            reasons.push('Hidden gem waiting to be discovered');
        }

        // Preferred artists connection
        if (userPreferences.preferredArtists?.includes(artist.name)) {
            reasons.push('One of your preferred artists');
        }

        // Default reason if no specific matches
        if (reasons.length === 0) {
            reasons.push('Recommended based on your music preferences');
        }

        return reasons;
    }

    /**
     * Get similar artists as objects (helper method)
     * @param artistId Artist identifier
     * @returns Promise resolving to array of similar artists
     */
    private async getSimilarArtistsObjects(artistId: string): Promise<Artist[]> {
        const similarArtistIds = await this.getSimilarArtists(artistId);
        const similarArtists: Artist[] = [];

        for (const id of similarArtistIds) {
            const artist = await this.artistRepository.getArtistById(id);
            if (artist) {
                similarArtists.push(artist);
            }
        }

        return similarArtists;
    }
}
