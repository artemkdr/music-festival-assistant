export type WebSearchProvider = 'brave';

export interface WebSearchRequest {
    query: string;
    count?: number | undefined;
    country?: string | undefined;
    searchLang?: string | undefined;
}

export interface WebSearchResult {
    url: string;
    title: string;
    snippets: string[];
    sourceType: 'generic' | 'poi' | 'map';
    rank: number;
}

export interface WebSearchResponse {
    query: string;
    results: WebSearchResult[];
    extractedAt: string;
}

export interface IWebSearchService {
    search(request: WebSearchRequest): Promise<WebSearchResponse>;
}

export class WebSearchError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode?: number,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'WebSearchError';
    }
}
