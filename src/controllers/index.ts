/**
 * API controllers for handling HTTP requests
 * Following clean architecture with dependency injection
 */
import type { ILogger } from '@/lib/logger';
import { FestivalDiscoveryRequestSchema, UserFeedbackSchema } from '@/schemas';
import type { IFestivalDiscoveryService, IUserFeedbackService } from '@/services/interfaces';
import type { ApiResponse, FestivalDiscoveryResponse, UserPreferences } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Controller for festival discovery endpoints
 */
export class FestivalDiscoveryController {
    constructor(
        private festivalDiscoveryService: IFestivalDiscoveryService,
        private logger: ILogger
    ) {}

    /**
     * Handle festival discovery by ID
     * POST /api/festivals/discover
     */
    async discoverArtists(request: NextRequest): Promise<NextResponse> {
        this.logger.info('Received festival discovery request');

        try {
            const body = await request.json();

            // Validate request body
            const validationResult = FestivalDiscoveryRequestSchema.safeParse(body);
            if (!validationResult.success) {
                this.logger.warn('Invalid request body', { errors: validationResult.error.errors });
                return this.createErrorResponse(
                    'Invalid request body',
                    validationResult.error.errors.map(e => e.message),
                    400
                );
            }

            const { festivalId, festivalUrl, userPreferences } = validationResult.data;

            let discoveryResponse: FestivalDiscoveryResponse;

            if (festivalId) {
                discoveryResponse = await this.festivalDiscoveryService.discoverArtists(festivalId, userPreferences as UserPreferences);
            } else if (festivalUrl) {
                discoveryResponse = await this.festivalDiscoveryService.discoverArtistsFromUrl(festivalUrl, userPreferences as UserPreferences);
            } else {
                return this.createErrorResponse('Either festivalId or festivalUrl must be provided', [], 400);
            }

            this.logger.info('Festival discovery completed successfully', {
                festivalId: discoveryResponse.festival.id,
                recommendationCount: discoveryResponse.recommendations.length,
            });

            return this.createSuccessResponse('Artists discovered successfully', discoveryResponse);
        } catch (error) {
            this.logger.error('Festival discovery failed', error as Error);
            return this.createErrorResponse('Failed to discover artists', [(error as Error).message], 500);
        }
    }

    /**
     * Handle recommendation refinement
     * POST /api/festivals/refine
     */
    async refineRecommendations(request: NextRequest): Promise<NextResponse> {
        this.logger.info('Received recommendation refinement request');

        try {
            const body = await request.json();
            const { sessionId, userPreferences } = body;

            if (!sessionId || !userPreferences) {
                return this.createErrorResponse('sessionId and userPreferences are required', [], 400);
            }

            const refinedRecommendations = await this.festivalDiscoveryService.refineRecommendations(sessionId, userPreferences);

            this.logger.info('Recommendations refined successfully', {
                sessionId,
                refinedCount: refinedRecommendations.length,
            });

            return this.createSuccessResponse('Recommendations refined successfully', refinedRecommendations);
        } catch (error) {
            this.logger.error('Recommendation refinement failed', error as Error);
            return this.createErrorResponse('Failed to refine recommendations', [(error as Error).message], 500);
        }
    }

    /**
     * Create success response
     * @param message Success message
     * @param data Response data
     * @returns NextResponse with success format
     */
    private createSuccessResponse<T>(message: string, data: T): NextResponse {
        const response: ApiResponse<T> = {
            status: 'success',
            message,
            data,
        };
        return NextResponse.json(response, { status: 200 });
    }

    /**
     * Create error response
     * @param message Error message
     * @param errors Array of error details
     * @param statusCode HTTP status code
     * @returns NextResponse with error format
     */
    private createErrorResponse(message: string, errors: string[], statusCode: number): NextResponse {
        const response: ApiResponse<never> = {
            status: 'error',
            message,
            errors,
        };
        return NextResponse.json(response, { status: statusCode });
    }
}

/**
 * Controller for user feedback endpoints
 */
export class UserFeedbackController {
    constructor(
        private userFeedbackService: IUserFeedbackService,
        private logger: ILogger
    ) {}

    /**
     * Handle user feedback submission
     * POST /api/feedback
     */
    async submitFeedback(request: NextRequest): Promise<NextResponse> {
        this.logger.info('Received user feedback submission');

        try {
            const body = await request.json();

            // Validate request body
            const validationResult = UserFeedbackSchema.safeParse(body);
            if (!validationResult.success) {
                this.logger.warn('Invalid feedback body', { errors: validationResult.error.errors });
                return this.createErrorResponse(
                    'Invalid feedback data',
                    validationResult.error.errors.map(e => e.message),
                    400
                );
            }

            const feedback = await this.userFeedbackService.recordFeedback(validationResult.data);

            this.logger.info('Feedback recorded successfully', {
                artistId: feedback.artistId,
                rating: feedback.rating,
                sessionId: feedback.sessionId,
            });

            return this.createSuccessResponse('Feedback recorded successfully', feedback);
        } catch (error) {
            this.logger.error('Failed to record feedback', error as Error);
            return this.createErrorResponse('Failed to record feedback', [(error as Error).message], 500);
        }
    }

    /**
     * Handle session analytics request
     * GET /api/feedback/analytics/{sessionId}
     */
    async getSessionAnalytics(request: NextRequest, { params }: { params: { sessionId: string } }): Promise<NextResponse> {
        const { sessionId } = params;
        this.logger.info('Received session analytics request', { sessionId });

        try {
            const analytics = await this.userFeedbackService.getSessionAnalytics(sessionId);

            this.logger.info('Session analytics generated', {
                sessionId,
                totalFeedback: analytics.totalFeedback,
            });

            return this.createSuccessResponse('Session analytics retrieved successfully', analytics);
        } catch (error) {
            this.logger.error('Failed to get session analytics', error as Error, { sessionId });
            return this.createErrorResponse('Failed to retrieve session analytics', [(error as Error).message], 500);
        }
    }

    /**
     * Create success response
     * @param message Success message
     * @param data Response data
     * @returns NextResponse with success format
     */
    private createSuccessResponse<T>(message: string, data: T): NextResponse {
        const response: ApiResponse<T> = {
            status: 'success',
            message,
            data,
        };
        return NextResponse.json(response, { status: 200 });
    }

    /**
     * Create error response
     * @param message Error message
     * @param errors Array of error details
     * @param statusCode HTTP status code
     * @returns NextResponse with error format
     */
    private createErrorResponse(message: string, errors: string[], statusCode: number): NextResponse {
        const response: ApiResponse<never> = {
            status: 'error',
            message,
            errors,
        };
        return NextResponse.json(response, { status: statusCode });
    }
}
