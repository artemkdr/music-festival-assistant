import { DIContainer } from '@/lib/di-container';
import { requireAdmin } from '@/lib/middleware/auth-middleware';
import { NextRequest } from 'next/server';

export const GET = requireAdmin(async (request: NextRequest): Promise<Response> => {
    const query = request.nextUrl.searchParams.get('q')?.trim();
    const container = DIContainer.getInstance();
    const logger = container.getLogger();
    const searchService = container.getSearchService();

    try {
        logger.info('Admin search request received', { query });

        // Validate query
        if (!query || query.length < 3) {
            return new Response(
                JSON.stringify({
                    status: 'error',
                    message: 'Query must be at least 3 characters long',
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Perform search
        const result = await searchService.searchFirst(query);

        return new Response(JSON.stringify({ status: 'success', data: result }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        logger.error('Admin search failed', error instanceof Error ? error : new Error(String(error)));
        return new Response(
            JSON.stringify({
                status: 'error',
                message: 'Search failed',
                error: error instanceof Error ? error.message : String(error),
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
