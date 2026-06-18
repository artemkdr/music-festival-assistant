import { BraveWebSearchService, WebSearchError } from '@/lib/services/web-search';
import type { ILogger } from '@/lib/types/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
};

describe('BraveWebSearchService', () => {
    let service: BraveWebSearchService;
    let fetchSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        fetchSpy = vi.fn();
        (global as unknown as { fetch: typeof fetch }).fetch = fetchSpy;
        service = new BraveWebSearchService(logger, {
            apiKey: 'test-key',
            baseUrl: 'https://api.search.brave.com/res',
            timeoutMs: 3000,
            defaultCount: 5,
        });
    });

    afterEach(() => {
        delete (global as unknown as { fetch?: typeof fetch }).fetch;
    });

    it('maps Brave grounding response to sorted results', async () => {
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                grounding: {
                    generic: [
                        {
                            url: 'https://artist.example.com',
                            title: 'Artist Home',
                            snippets: ['Main biography snippet'],
                        },
                    ],
                    poi: {
                        url: 'https://venue.example.com',
                        title: 'Famous Venue',
                        snippets: ['Frequently performs live here'],
                    },
                },
            }),
        } as unknown as Response);

        const result = await service.search({ query: 'Test Artist' });

        expect(result.results).toHaveLength(2);
        expect(result.results[0]?.sourceType).toBe('generic');
        expect(result.results[1]?.sourceType).toBe('poi');
        expect(result.results[0]?.rank).toBe(1);
        expect(result.results[1]?.rank).toBe(2);
    });

    it('throws a typed error for rate-limited responses', async () => {
        fetchSpy.mockResolvedValueOnce({
            ok: false,
            status: 429,
            text: vi.fn().mockResolvedValue(
                JSON.stringify({
                    error: {
                        detail: 'Rate limit exceeded',
                        code: 'rate_limited',
                    },
                })
            ),
        } as unknown as Response);

        await expect(service.search({ query: 'Test Artist' })).rejects.toMatchObject({
            name: 'WebSearchError',
            code: 'rate_limited',
            statusCode: 429,
            retryable: true,
        });
    });

    it('fails closed when no usable grounding snippets are returned', async () => {
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                grounding: {
                    generic: [
                        {
                            url: 'https://artist.example.com',
                            title: 'Artist Home',
                            snippets: [],
                        },
                    ],
                },
            }),
        } as unknown as Response);

        await expect(service.search({ query: 'Test Artist' })).rejects.toMatchObject({
            name: 'WebSearchError',
            code: 'empty_grounding',
        });
    });

    it('fails for empty query', async () => {
        await expect(service.search({ query: ' ' })).rejects.toBeInstanceOf(WebSearchError);
    });
});
