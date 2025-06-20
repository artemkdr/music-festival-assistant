/**
 * Dependency injection container
 * Central place to configure and wire up all services following SOLID principles
 */
import { createLogger, type ILogger } from '@/lib/logger';
import { getAIConfig, validateAIConfig } from '@/lib/ai-config';
import type { IFestivalRepository, IArtistRepository, IPerformanceRepository, IUserFeedbackRepository } from '@/repositories/interfaces';
import { LocalJsonFestivalRepository, LocalJsonArtistRepository, LocalJsonPerformanceRepository, LocalJsonUserFeedbackRepository } from '@/repositories/local-json-repositories';
import type { IFestivalDiscoveryService, IRecommendationService, IUserFeedbackService } from '@/services/interfaces';
import { FestivalDiscoveryService } from '@/services/festival-discovery-service';
import { RecommendationService } from '@/services/recommendation-service';
import { UserFeedbackService } from '@/services/user-feedback-service';
import { FestivalDiscoveryController, UserFeedbackController } from '@/controllers';
import type { IAIService } from '@/services/ai';
import { AIServiceFactory } from '@/services/ai';
import type { IFestivalCrawlerService } from '@/services/crawler/interfaces';
import { FestivalCrawlerService } from '@/services/crawler/festival-crawler-service';

/**
 * Dependency injection container class
 */
export class DIContainer {
    private static instance: DIContainer;

    // Singletons
    private _logger: ILogger | null = null;
    private _aiService: IAIService | null = null;
    private _festivalCrawlerService: IFestivalCrawlerService | null = null;
    private _festivalRepository: IFestivalRepository | null = null;
    private _artistRepository: IArtistRepository | null = null;
    private _performanceRepository: IPerformanceRepository | null = null;
    private _userFeedbackRepository: IUserFeedbackRepository | null = null;
    private _recommendationService: IRecommendationService | null = null;
    private _festivalDiscoveryService: IFestivalDiscoveryService | null = null;
    private _userFeedbackService: IUserFeedbackService | null = null;
    private _festivalDiscoveryController: FestivalDiscoveryController | null = null;
    private _userFeedbackController: UserFeedbackController | null = null;

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
     * Get AI service instance (optional - may return null if disabled or not configured)
     */
    public getAIService(): IAIService | null {
        if (!this._aiService) {
            try {
                const aiConfig = getAIConfig();
                if (aiConfig.enabled) {
                    validateAIConfig(aiConfig);
                    const factory = new AIServiceFactory(this.getLogger());
                    this._aiService = factory.createAIService(aiConfig.provider, aiConfig.config);
                    this.getLogger().info('AI service initialized', { provider: aiConfig.provider, model: aiConfig.config.model });
                } else {
                    this.getLogger().info('AI service is disabled');
                }
            } catch (error) {
                this.getLogger().error('Failed to initialize AI service', error instanceof Error ? error : new Error(String(error)));
                // Return null instead of throwing to allow the app to continue without AI features
            }
        }
        return this._aiService;
    }

    /**
     * Get festival crawler service
     */
    public getFestivalCrawlerService(): IFestivalCrawlerService {
        if (!this._festivalCrawlerService) {
            const logger = this.getLogger();
            const aiService = this.getAIService(); // This can return null if AI is disabled
            this._festivalCrawlerService = new FestivalCrawlerService(logger, aiService);
            logger.info('Festival crawler service initialized', { aiEnabled: !!aiService });
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
     * Get performance repository
     */
    public getPerformanceRepository(): IPerformanceRepository {
        if (!this._performanceRepository) {
            this._performanceRepository = new LocalJsonPerformanceRepository(this.getLogger());
        }
        return this._performanceRepository;
    }

    /**
     * Get user feedback repository
     */
    public getUserFeedbackRepository(): IUserFeedbackRepository {
        if (!this._userFeedbackRepository) {
            this._userFeedbackRepository = new LocalJsonUserFeedbackRepository(this.getLogger());
        }
        return this._userFeedbackRepository;
    }

    /**
     * Get recommendation service
     */
    public getRecommendationService(): IRecommendationService {
        if (!this._recommendationService) {
            this._recommendationService = new RecommendationService(this.getArtistRepository(), this.getPerformanceRepository(), this.getLogger(), this.getAIService());
        }
        return this._recommendationService;
    }

    /**
     * Get festival discovery service
     */
    public getFestivalDiscoveryService(): IFestivalDiscoveryService {
        if (!this._festivalDiscoveryService) {
            this._festivalDiscoveryService = new FestivalDiscoveryService(this.getFestivalRepository(), this.getRecommendationService(), this.getLogger());
        }
        return this._festivalDiscoveryService;
    }

    /**
     * Get user feedback service
     */
    public getUserFeedbackService(): IUserFeedbackService {
        if (!this._userFeedbackService) {
            this._userFeedbackService = new UserFeedbackService(this.getUserFeedbackRepository(), this.getLogger());
        }
        return this._userFeedbackService;
    }

    /**
     * Get festival discovery controller
     */
    public getFestivalDiscoveryController(): FestivalDiscoveryController {
        if (!this._festivalDiscoveryController) {
            this._festivalDiscoveryController = new FestivalDiscoveryController(this.getFestivalDiscoveryService(), this.getLogger());
        }
        return this._festivalDiscoveryController;
    }

    /**
     * Get user feedback controller
     */
    public getUserFeedbackController(): UserFeedbackController {
        if (!this._userFeedbackController) {
            this._userFeedbackController = new UserFeedbackController(this.getUserFeedbackService(), this.getLogger());
        }
        return this._userFeedbackController;
    }

    /**
     * Reset all singletons (useful for testing)
     */
    public reset(): void {
        this._logger = null;
        this._aiService = null;
        this._festivalRepository = null;
        this._artistRepository = null;
        this._performanceRepository = null;
        this._userFeedbackRepository = null;
        this._recommendationService = null;
        this._festivalDiscoveryService = null;
        this._userFeedbackService = null;
        this._festivalDiscoveryController = null;
        this._userFeedbackController = null;
    }
}

/**
 * Convenience function to get DI container instance
 */
export const container = (): DIContainer => DIContainer.getInstance();
