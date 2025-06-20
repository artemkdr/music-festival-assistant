/**
 * User feedback API route
 * POST /api/feedback
 */
import { NextRequest } from 'next/server';
import { container } from '@/lib/container';

export async function POST(request: NextRequest) {
    const controller = container().getUserFeedbackController();
    return await controller.submitFeedback(request);
}
