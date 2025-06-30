import { SearchResult } from '@/lib/services/crawler/interfaces';
import { apiClient, ApiClient } from './api-client';
import type { ApiResponse } from './types';

export class SearchApi {
    constructor(private client: ApiClient) {}

    /**
     * Admin: Search artists on Spotify
     */
    async searchFirst(query: string): Promise<ApiResponse<{ result: SearchResult }>> {
        return this.client.request(`/admin/crawl/search?q=${encodeURIComponent(query)}`);
    }
}

export const searchApi = new SearchApi(apiClient);
