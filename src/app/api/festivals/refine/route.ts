/**
 * Recommendation refinement API route
 * POST /api/festivals/refine
 */
import { NextRequest } from 'next/server';
import { container } from '@/lib/container';

export async function POST(request: NextRequest) {
    const controller = container().getFestivalDiscoveryController();
    return await controller.refineRecommendations(request);
}
