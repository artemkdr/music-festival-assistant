/**
 * AI-enhanced festival discovery endpoint
 */
import { container } from '@/lib/di-container';
import type { UserPreferences } from '@/lib/schemas';
import { FestivalDiscoveryRequestSchema } from '@/lib/schemas';
import { toError } from '@/lib/utils/error-handler';
import { getFestivalArtists } from '@/lib/utils/festival-util';
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

        if (validatedData.userPreferences.genres?.length === 0 && !validatedData.userPreferences.comment?.trim()) {
            return NextResponse.json(
                {
                    message: 'At least one genre or additional preferences must be provided',
                },
                { status: 400 }
            );
        }

        logger.info('AI-enhanced festival discovery requested', {
            festivalId: validatedData.festivalId,
            userGenres: validatedData.userPreferences.genres,
        });

        // Get festival data
        const festivalService = container().getFestivalService();
        const festival = await festivalService.getFestivalById(validatedData.festivalId);

        if (!festival) {
            return NextResponse.json(
                {
                    message: `Festival with ID ${validatedData.festivalId} not found`,
                },
                { status: 404 }
            );
        }

        // Generate AI-enhanced recommendations
        const aiRecommendations = await recommendationService.generateAIEnhancedRecommendations(festival, validatedData.userPreferences as UserPreferences);

        const response = {
            status: 'success' as const,
            message: 'AI-enhanced festival discovery completed',
            data: {
                festival,
                recommendations: aiRecommendations,
                totalArtists: getFestivalArtists(festival).length,
                totalRecommendations: aiRecommendations.length,
                aiEnhanced: true,
                enhancedCount: aiRecommendations.filter(r => r.aiEnhanced).length,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        const logger = container().getLogger();
        logger.error('AI-enhanced festival discovery failed', toError(error));

        return NextResponse.json(
            {
                message: 'AI-enhanced festival discovery failed',
            },
            { status: 500 }
        );
    }
}
