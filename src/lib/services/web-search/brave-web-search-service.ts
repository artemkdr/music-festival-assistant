import type { ILogger } from '@/lib/types/logger';
import { toError } from '@/lib/utils/error-handler';
import { IWebSearchService, WebSearchError, WebSearchRequest, WebSearchResponse, WebSearchResult } from './interfaces';

interface BraveSearchErrorPayload {
    error?: {
        detail?: string;
        code?: string;
        status?: number;
    };
}

interface BraveGroundingItem {
    url?: string;
    title?: string;
    snippets?: string[];
}

interface BraveLLMContextResponse {
    grounding?: {
        generic?: BraveGroundingItem[];
        poi?: BraveGroundingItem;
        map?: BraveGroundingItem[];
    };
}

export interface BraveWebSearchConfig {
    apiKey: string;
    baseUrl: string;
    timeoutMs: number;
    defaultCount: number;
    defaultCountry?: string | undefined;
    defaultSearchLang?: string | undefined;
}

export class BraveWebSearchService implements IWebSearchService {
    constructor(
        private readonly logger: ILogger,
        private readonly config: BraveWebSearchConfig
    ) {}

    public async search(request: WebSearchRequest): Promise<WebSearchResponse> {
        const query = request.query.trim();
        if (!query) {
            throw new WebSearchError('Web search query cannot be empty', 'invalid_query');
        }

        if (!this.config.apiKey) {
            throw new WebSearchError('Brave search API key is not configured', 'missing_api_key');
        }

        const count = request.count ?? this.config.defaultCount;
        const country = request.country ?? this.config.defaultCountry;
        const searchLang = request.searchLang ?? this.config.defaultSearchLang;
        const url = this.buildUrl({
            query,
            count,
            ...(country ? { country } : {}),
            ...(searchLang ? { searchLang } : {}),
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'X-Subscription-Token': this.config.apiKey,
                },
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!response.ok) {
                const raw = await response.text();
                const parsedError = this.parseErrorBody(raw);
                const message = parsedError.error?.detail || `Brave web search failed with status ${response.status}`;
                const errorCode = parsedError.error?.code || `http_${response.status}`;
                const retryable = response.status === 429 || response.status >= 500;
                throw new WebSearchError(message, errorCode, response.status, retryable);
            }

            const data = (await response.json()) as BraveLLMContextResponse;
            const results = this.mapGroundingResults(data);
            if (results.length === 0) {
                throw new WebSearchError('Brave web search returned no usable grounding results', 'empty_grounding');
            }

            return {
                query,
                results,
                extractedAt: new Date().toISOString(),
            };
        } catch (error) {
            clearTimeout(timeout);

            if (error instanceof WebSearchError) {
                throw error;
            }

            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new WebSearchError('Brave web search request timed out', 'timeout', undefined, true);
            }

            this.logger.error('Unexpected Brave web search failure', toError(error));
            throw new WebSearchError(`Brave web search failed: ${toError(error).message}`, 'request_failed', undefined, true);
        }
    }

    private buildUrl(params: { query: string; count: number; country?: string; searchLang?: string }): string {
        const url = new URL('/v1/llm/context', this.config.baseUrl);
        url.searchParams.set('q', params.query);
        url.searchParams.set('count', String(Math.min(Math.max(params.count, 1), 50)));
        if (params.country) {
            url.searchParams.set('country', params.country);
        }
        if (params.searchLang) {
            url.searchParams.set('search_lang', params.searchLang);
        }
        url.searchParams.set('spellcheck', 'false');
        return url.toString();
    }

    private mapGroundingResults(payload: BraveLLMContextResponse): WebSearchResult[] {
        const results: WebSearchResult[] = [];
        let rank = 1;
        const pushItem = (item: BraveGroundingItem, sourceType: 'generic' | 'poi' | 'map') => {
            const snippets = (item.snippets || []).filter(Boolean).map(snippet => snippet.trim()).filter(Boolean);
            if (!item.url || !item.title || snippets.length === 0) {
                return;
            }
            results.push({
                url: item.url,
                title: item.title,
                snippets,
                sourceType,
                rank,
            });
            rank++;
        };

        for (const item of payload.grounding?.generic || []) {
            pushItem(item, 'generic');
        }
        if (payload.grounding?.poi) {
            pushItem(payload.grounding.poi, 'poi');
        }
        for (const item of payload.grounding?.map || []) {
            pushItem(item, 'map');
        }

        return results.sort((a, b) => a.rank - b.rank);
    }

    private parseErrorBody(raw: string): BraveSearchErrorPayload {
        try {
            return JSON.parse(raw) as BraveSearchErrorPayload;
        } catch {
            return {};
        }
    }
}
