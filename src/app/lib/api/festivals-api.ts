import type { ApiResponse, Festival } from './types';
import { apiClient, ApiClient } from './api-client';

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
    async crawlFestival<T>(data: { urls: string[]; forcedName?: string | undefined; files?: { name: string; type: string; base64: string }[] | undefined }): Promise<ApiResponse<T>> {
        // Support backward compatibility with single URL string
        const requestBody = typeof data === 'string' ? { urls: [data] } : data;

        return this.client.request('/admin/crawl-festival', {
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
