import type { ApiResponse, Artist } from './types';
import { ApiClient, apiClient } from './api-client';

class ArtistsApi {
    constructor(private client: ApiClient) {}

    async getArtists(): Promise<ApiResponse<Artist[]>> {
        return this.client.request('/admin/artists');
    }

    async getArtist(id: string): Promise<ApiResponse<Artist>> {
        return this.client.request(`/admin/artists/${id}`);
    }

    async updateArtist(id: string, artistData: Partial<Artist>): Promise<ApiResponse<Artist>> {
        return this.client.request(`/admin/artists/${id}`, {
            method: 'PUT',
            body: JSON.stringify(artistData),
        });
    }

    async getArtistPerformances(id: string): Promise<ApiResponse> {
        return this.client.request(`/admin/artists/${id}/performances`);
    }

    /**
     * Admin: Crawl artists
     */
    async crawlArtists(data: { festivalId?: string; artistNames?: string[] }): Promise<ApiResponse> {
        return this.client.request('/admin/crawl-artists', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}

export const artistsApi = new ArtistsApi(apiClient);
