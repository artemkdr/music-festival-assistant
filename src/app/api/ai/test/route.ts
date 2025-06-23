/**
 * AI service status and testing endpoint
 */
import { getAIConfigStatus } from '@/lib/ai-config';
import { container } from '@/lib/container';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
    input: z.array(z.string().max(10000)).min(1).max(10),
    type: z.enum(['text', 'artist', 'festival']).default('text'),
    temperature: z.number().min(0).max(1).default(0.3),
});

/**
 * POST /api/ai/test - Test AI service functionality
 */
export async function POST(request: NextRequest) {
    try {
        const logger = container().getLogger();
        const musicalAiService = container().getMusicalAIService();
        const aiService = container().getAIService();

        if (!aiService || !musicalAiService) {
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

        logger.info('Testing AI service', { type: validatedData.type, inputLength: validatedData.input.length });

        // prepare the AI request from input
        if (validatedData.input.length === 0) {
            return NextResponse.json(
                {
                    status: 'error' as const,
                    message: 'Input array cannot be empty',
                    errors: ['Input array must contain at least one item'],
                },
                { status: 400 }
            );
        }

        let result;

        switch (validatedData.type) {
            case 'text':
                result = await aiService.generateCompletion({
                    prompt: validatedData.input.join('\n'),
                });
                break;
            case 'artist':
                result = await musicalAiService.getArtistDetails(validatedData.input);
                break;
            case 'festival':
                result = await musicalAiService.scrapeFestivalLineup(validatedData.input);
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
