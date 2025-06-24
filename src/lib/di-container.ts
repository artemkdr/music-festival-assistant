/**
 * Dependency injection container
 * Central place to configure and wire up all services following SOLID principles
 */
import { getAIConfig, validateAIConfig } from '@/config/ai-config';
import { createLogger, type ILogger } from '@/lib/logger';
import type { IArtistRepository, IFestivalRepository } from '@/repositories/interfaces';
import { LocalJsonArtistRepository, LocalJsonFestivalRepository } from '@/repositories/providers/local';
import type { IAIService } from '@/services/ai';
import { AIServiceFactory } from '@/services/ai';
import { IMusicalAIService } from '@/services/ai/interfaces';
import { MusicalAIService } from '@/services/ai/musical-ai-service';
import { ArtistService, IArtistService } from '@/services/artist-service';
import { AuthService } from '@/services/auth/auth-service';
import { DummyAuthProvider } from '@/services/auth/dummy-auth-provider';
import type { IAuthService } from '@/services/auth/interfaces';
import { ArtistCrawlerService } from '@/services/crawler/artist-crawler-service';
import { FestivalCrawlerService } from '@/services/crawler/festival-crawler-service';
import type { IArtistCrawlerService, IFestivalCrawlerService } from '@/services/crawler/interfaces';
import { FestivalService, IFestivalService } from '@/services/festival-service';
import type { IRecommendationService } from '@/services/interfaces';
import { RecommendationService } from '@/services/recommendation-service';
import { SpotifyService } from '@/services/spotify/spotify-service';

/**
 * Dependency injection container class
 */
export class DIContainer {
    private static instance: DIContainer;

    // Singletons
    private _logger: ILogger | null = null;
    private _aiService: IAIService | null = null;
    private _musicalAIService: IMusicalAIService | null = null;
    private _artistService: IArtistService | null = null;
    private _festivalService: IFestivalService | null = null;
    private _festivalCrawlerService: IFestivalCrawlerService | null = null;
    private _festivalRepository: IFestivalRepository | null = null;
    private _artistRepository: IArtistRepository | null = null;
    private _recommendationService: IRecommendationService | null = null;
    private _artistCrawlerService: ArtistCrawlerService | null = null;
    private _authService: IAuthService | null = null;

    /**
     * Get singleton instance
     */
    public static getInstance(): DIContainer {
        if (!DIContainer.instance) {
            DIContainer.instance = new DIContainer();
        }
        return DIContainer.instance;
    }

    /**
     * Get logger instance
     */
    public getLogger(): ILogger {
        if (!this._logger) {
            this._logger = createLogger();
        }
        return this._logger;
    }

    /**
     * Get artist service instance
     */
    public getArtistService(): IArtistService {
        if (!this._artistService) {
            const logger = this.getLogger();
            const artistRepository = this.getArtistRepository();
            const artistCrawlerService = this.getArtistCrawlerService();
            this._artistService = new ArtistService(artistRepository, artistCrawlerService, logger);
            logger.info('Artist service initialized');
        }
        return this._artistService;
    }

    /**
     * Get festival service instance
     */
    public getFestivalService(): IFestivalService {
        if (!this._festivalService) {
            const logger = this.getLogger();
            const festivalRepository = this.getFestivalRepository();
            const festivalCrawlerService = this.getFestivalCrawlerService();
            this._festivalService = new FestivalService(festivalRepository, festivalCrawlerService, logger);
            logger.info('Festival service initialized');
        }
        return this._festivalService;
    }

    /**
     * Get AI service instance (optional - may return null if disabled or not configured)
     */
    public getAIService(): IAIService | null {
        if (!this._aiService) {
            try {
                const aiConfig = getAIConfig();
                validateAIConfig(aiConfig);
                const factory = new AIServiceFactory(this.getLogger());
                this._aiService = factory.createAIService(aiConfig.provider, aiConfig.config);
                this.getLogger().info('AI service initialized', { provider: aiConfig.provider, model: aiConfig.config.model });
            } catch (error) {
                this.getLogger().error('Failed to initialize AI service', error instanceof Error ? error : new Error(String(error)));
                // Return null instead of throwing to allow the app to continue without AI features
            }
        }
        return this._aiService;
    }

    /**
     * Get musical AI service instance (optional - may return null if disabled or not configured)
     */
    public getMusicalAIService(): IMusicalAIService | null {
        if (!this._musicalAIService) {
            const aiService = this.getAIService();
            if (aiService) {
                this._musicalAIService = new MusicalAIService(aiService);
            }
        }
        return this._musicalAIService;
    }

    /**
     * Get festival crawler service
     */
    public getFestivalCrawlerService(): IFestivalCrawlerService {
        if (!this._festivalCrawlerService) {
            const logger = this.getLogger();
            const aiService = this.getMusicalAIService(); // This can return null if AI is disabled
            this._festivalCrawlerService = new FestivalCrawlerService(logger, aiService);
            logger.info('Festival crawler service initialized');
        }
        return this._festivalCrawlerService;
    }

    /**
     * Get festival repository
     */
    public getFestivalRepository(): IFestivalRepository {
        if (!this._festivalRepository) {
            this._festivalRepository = new LocalJsonFestivalRepository(this.getLogger());
        }
        return this._festivalRepository;
    }

    /**
     * Get artist repository
     */
    public getArtistRepository(): IArtistRepository {
        if (!this._artistRepository) {
            this._artistRepository = new LocalJsonArtistRepository(this.getLogger());
        }
        return this._artistRepository;
    }

    /**
     * Get recommendation service
     */
    public getRecommendationService(): IRecommendationService {
        if (!this._recommendationService) {
            if (!this.getMusicalAIService()) {
                throw new Error('Musical AI service is required for recommendation service');
            }
            this._recommendationService = new RecommendationService(this.getLogger(), this.getMusicalAIService()!, this.getArtistRepository());
        }
        return this._recommendationService;
    }

    /**
     * Get artist crawler service
     */
    public getArtistCrawlerService(): IArtistCrawlerService {
        if (!this._artistCrawlerService) {
            const logger = this.getLogger();
            // You may want to load the access token from env/config
            if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
                throw new Error('Spotify client ID and secret must be set in environment variables');
            }
            const spotifyApi = new SpotifyService(logger, process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET);
            const aiService = this.getMusicalAIService();
            this._artistCrawlerService = new ArtistCrawlerService(logger, spotifyApi, aiService!);
            logger.info('Artist crawler service initialized');
        }
        return this._artistCrawlerService;
    }

    /**
     * Get authentication service
     */
    public getAuthService(): IAuthService {
        if (!this._authService) {
            const logger = this.getLogger();
            const authProvider = new DummyAuthProvider(logger);
            this._authService = new AuthService(authProvider, logger);
            logger.info('Auth service initialized with dummy provider');
        }
        return this._authService;
    }

    /**
     * Get Spotify API service
     */
    public getSpotifyService(): SpotifyService {
        if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
            throw new Error('Spotify client ID and secret must be set in environment variables');
        }
        return new SpotifyService(this.getLogger(), process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET);
    }

    /**
     * Reset all singletons (useful for testing)
     */
    public reset(): void {
        this._logger = null;
        this._aiService = null;
        this._festivalRepository = null;
        this._artistRepository = null;
        this._recommendationService = null;
        this._artistCrawlerService = null;
        this._authService = null;
    }
}

/**
 * Convenience function to get DI container instance
 */
export const container = (): DIContainer => DIContainer.getInstance();
