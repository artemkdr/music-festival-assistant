import { Festival } from '@/lib/schemas';
import { apiClient, ApiClient } from './api-client';
import type { ApiResponse } from './types';

class FestivalsApi {
    constructor(private client: ApiClient) {}

    async getFestivals(): Promise<ApiResponse<Festival[]>> {
        return this.client.request('/admin/festivals');
    }

    async getFestival(id: string): Promise<ApiResponse<Festival>> {
        return this.client.request(`/admin/festivals/${id}`);
    }

    async updateFestival(id: string, festivalData: Partial<Festival>): Promise<ApiResponse<Festival>> {
        return this.client.request(`/admin/festivals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(festivalData),
        });
    }

    /**
     * Admin: Crawl festival
     */
    async crawlFestival(data: {
        urls: string[];
        forcedName?: string | undefined;
        files?:
            | {
                  name: string;
                  type: string;
                  base64: string;
              }[]
            | undefined;
    }): Promise<ApiResponse<string>> {
        // Support backward compatibility with single URL string
        const requestBody = typeof data === 'string' ? { urls: [data] } : data;

        // this request returns a 303 redirect to the edit page of the parsed festival
        return this.client.request<string>('/admin/crawl/festival', {
            method: 'POST',
            body: JSON.stringify(requestBody),
        });
    }

    /**
     * Get festival recommendations
     */
    async getFestivalRecommendations(preferences: unknown): Promise<ApiResponse> {
        return this.client.request('/festivals/discover', {
            method: 'POST',
            body: JSON.stringify(preferences),
        });
    }
}

export const festivalsApi = new FestivalsApi(apiClient);
