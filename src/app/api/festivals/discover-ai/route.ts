/**
 * AI-enhanced festival discovery endpoint
 */
import { container } from '@/lib/di-container';
import { FestivalDiscoveryRequestSchema, getFestivalPerformances } from '@/schemas';
import type { UserPreferences } from '@/schemas';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/festivals/discover-ai - AI-enhanced festival discovery
 */
export async function POST(request: NextRequest) {
    try {
        const logger = container().getLogger();
        const recommendationService = container().getRecommendationService();

        const body = await request.json();
        const validatedData = FestivalDiscoveryRequestSchema.parse(body);

        logger.info('AI-enhanced festival discovery requested', {
            festivalId: validatedData.festivalId,
            festivalUrl: validatedData.festivalUrl,
            userGenres: validatedData.userPreferences.genres,
        });

        let response;

        if (validatedData.festivalId) {
            // Get festival data
            const festivalService = container().getFestivalService();
            const festival = await festivalService.getFestivalById(validatedData.festivalId);

            if (!festival) {
                return NextResponse.json(
                    {
                        status: 'error' as const,
                        message: 'Festival not found',
                        errors: [`Festival with ID ${validatedData.festivalId} not found`],
                    },
                    { status: 404 }
                );
            } // Generate AI-enhanced recommendations
            const aiRecommendations = await recommendationService.generateAIEnhancedRecommendations(festival, validatedData.userPreferences as UserPreferences);

            response = {
                status: 'success' as const,
                message: 'AI-enhanced festival discovery completed',
                data: {
                    festival,
                    recommendations: aiRecommendations,
                    totalArtists: getFestivalPerformances(festival).length,
                    totalRecommendations: aiRecommendations.length,
                    aiEnhanced: true,
                    enhancedCount: aiRecommendations.filter(r => r.aiEnhanced).length,
                },
            };
        } else {
            return NextResponse.json(
                {
                    status: 'error' as const,
                    message: 'Either festivalId or festivalUrl must be provided',
                    errors: ['Missing required parameter: festivalId or festivalUrl'],
                },
                { status: 400 }
            );
        }

        return NextResponse.json(response);
    } catch (error) {
        const logger = container().getLogger();
        logger.error('AI-enhanced festival discovery failed', error instanceof Error ? error : new Error(String(error)));

        return NextResponse.json(
            {
                status: 'error' as const,
                message: 'AI-enhanced festival discovery failed',
                errors: [error instanceof Error ? error.message : 'Unknown error'],
            },
            { status: 500 }
        );
    }
}
