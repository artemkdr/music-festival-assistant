import { Artist, FestivalAct } from '@/lib/schemas';
import { ApiClient, apiClient } from './api-client';
import type { ApiResponse } from './types';

class ArtistsApi {
    constructor(private client: ApiClient) {}

    async getArtists(): Promise<ApiResponse<Artist[]>> {
        return this.client.request<Artist[]>('/admin/artists');
    }

    async getArtist(id: string): Promise<ApiResponse<Artist>> {
        return this.client.request<Artist>(`/admin/artists/${id}`);
    }

    async deleteArtist(id: string): Promise<ApiResponse> {
        return this.client.request(`/admin/artists/${id}`, {
            method: 'DELETE',
        });
    }

    async updateArtist(id: string, artistData: Partial<Artist>): Promise<ApiResponse<Artist>> {
        return this.client.request<Artist>(`/admin/artists/${id}`, {
            method: 'PUT',
            body: JSON.stringify(artistData),
        });
    }

    async getArtistActs(id: string): Promise<ApiResponse<FestivalAct[]>> {
        return this.client.request(`/admin/artists/${id}/acts`);
    }

    /**
     * Admin: Crawl artists
     */
    async crawlArtists(data: { festivalId?: string; artistNames?: string[] }): Promise<ApiResponse> {
        return this.client.request('/admin/crawl/artists', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Admin: Recrawl a single artist with custom context
     * @param data { id, name, spotifyId, context }
     */
    async recrawlArtist(data: { id: string; name?: string | undefined; spotifyId?: string | undefined; context?: string | undefined }): Promise<ApiResponse<Artist>> {
        return this.client.request<Artist>('/admin/crawl/artist', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}

export const artistsApi = new ArtistsApi(apiClient);
