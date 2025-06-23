/**
 * Data initialization utility
 * Seeds local repositories with sample data if they are empty
 */
import { DIContainer } from '@/lib/container';
import { mockArtists, mockFestival } from '@/lib/mock-data';

/**
 * Initialize repositories with sample data if they are empty
 */
export async function initializeRepositories(): Promise<void> {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();

    logger.info('Initializing repositories with sample data...');

    try {
        // Initialize festivals
        const festivalRepository = container.getFestivalRepository();
        const existingFestivals = await festivalRepository.getAllFestivals();

        if (existingFestivals.length === 0) {
            await festivalRepository.saveFestival(mockFestival);
            logger.info('Initialized festival repository with sample data', {
                festivalId: mockFestival.id,
                festivalName: mockFestival.name,
            });
        } else {
            logger.info('Festival repository already has data', { count: existingFestivals.length });
        }

        // Initialize artists
        const artistRepository = container.getArtistRepository();
        const existingArtists = await artistRepository.getAllArtists();

        if (existingArtists.length === 0) {
            for (const artist of mockArtists) {
                await artistRepository.saveArtist(artist); // Cast to access saveArtist method
            }
            logger.info('Initialized artist repository with sample data', { count: mockArtists.length });
        } else {
            logger.info('Artist repository already has data', { count: existingArtists.length });
        }

        logger.info('Repository initialization completed successfully');
    } catch (error) {
        logger.error('Failed to initialize repositories', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}

/**
 * Reset all repositories (useful for testing)
 */
export async function resetRepositories(): Promise<void> {
    const container = DIContainer.getInstance();
    const logger = container.getLogger();

    logger.warn('Resetting all repository data...');

    try {
        // This would require implementing a reset/clear method in repositories
        // For now, we'll just log the intention
        logger.warn('Repository reset not implemented - would need to delete JSON files manually');
    } catch (error) {
        logger.error('Failed to reset repositories', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}
