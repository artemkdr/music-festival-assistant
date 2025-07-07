/**
 * Invalidate cache route handler
 */
import { NextResponse } from 'next/server';
import { ICacheService } from '@/lib/services/cache/interfaces';
import { DIContainer } from '@/lib/di-container';
import { z } from 'zod';

const InvalidateCacheSchema = z.object({
    pattern: z.string().min(1, 'Pattern is required'),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsedBody = InvalidateCacheSchema.parse(body);
        const pattern = parsedBody.pattern;
        const cacheService: ICacheService = DIContainer.getInstance().getCacheService();
        await cacheService.invalidatePattern(pattern);
        return NextResponse.json({ message: `Cache invalidated for pattern: ${pattern}` });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    message: 'Invalid request data',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                },
                { status: 400 }
            );
        }

        console.error('Error invalidating cache:', error);
        return NextResponse.json({ error: 'Failed to invalidate cache' }, { status: 500 });
    }
}
