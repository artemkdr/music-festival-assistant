/**
 * AI service status and testing endpoint
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { getAIConfigStatus } from '@/lib/ai-config';
import { z } from 'zod';
import { ParsedLineupDataSchema } from '@/services/ai/schemas';

/**
 * GET /api/ai/status - Get AI service configuration status
 */
export async function GET() {
    try {
        const logger = container().getLogger();
        const configStatus = getAIConfigStatus();

        logger.info('AI service status requested', configStatus);

        const response = {
            status: 'success' as const,
            message: 'AI service status retrieved',
            data: configStatus,
        };

        return NextResponse.json(response);
    } catch (error) {
        const logger = container().getLogger();
        logger.error('Failed to get AI service status', error instanceof Error ? error : new Error(String(error)));

        return NextResponse.json(
            {
                status: 'error' as const,
                message: 'Failed to get AI service status',
                errors: [error instanceof Error ? error.message : 'Unknown error'],
            },
            { status: 500 }
        );
    }
}

/**
 * Test AI service schema
 */
const testAIRequestSchema = z.object({
    prompt: z.string().min(1).max(1000),
    type: z.enum(['completion', 'festival_parsing', 'artist_matching', 'recommendations']).default('completion'),
});

/**
 * POST /api/ai/test - Test AI service functionality
 */
export async function POST(request: NextRequest) {
    try {
        const logger = container().getLogger();
        const aiService = container().getAIService();

        if (!aiService) {
            return NextResponse.json(
                {
                    status: 'error' as const,
                    message: 'AI service is not available or configured',
                    errors: ['AI service is disabled or not properly configured'],
                },
                { status: 503 }
            );
        }

        const body = await request.json();
        const validatedData = testAIRequestSchema.parse(body);

        logger.info('Testing AI service', { type: validatedData.type, promptLength: validatedData.prompt.length });

        let result;

        switch (validatedData.type) {
            case 'completion':
                result = await aiService.generateCompletion({
                    prompt: validatedData.prompt,
                });
                break;

            case 'festival_parsing':
                result = await aiService.parseFestivalData({
                    prompt: validatedData.prompt,
                    festivalData: validatedData.prompt,
                    expectedFormat: 'lineup',
                    schema: ParsedLineupDataSchema,
                });
                break;

            case 'artist_matching':
                result = await aiService.matchArtist({
                    prompt: validatedData.prompt,
                    artistName: validatedData.prompt,
                });
                break;

            case 'recommendations':
                result = await aiService.generateRecommendations({
                    prompt: validatedData.prompt,
                    userPreferences: { genres: ['rock'], discoveryMode: 'balanced' },
                    availableArtists: [],
                });
                break;

            default:
                throw new Error('Invalid test type');
        }

        const response = {
            status: 'success' as const,
            message: 'AI service test completed',
            data: {
                type: validatedData.type,
                result,
                providerInfo: aiService.getProviderInfo(),
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        const logger = container().getLogger();
        logger.error('AI service test failed', error instanceof Error ? error : new Error(String(error)));

        return NextResponse.json(
            {
                status: 'error' as const,
                message: 'AI service test failed',
                errors: [error instanceof Error ? error.message : 'Unknown error'],
            },
            { status: 500 }
        );
    }
}
