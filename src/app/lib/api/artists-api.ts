import type { ApiResponse, ArtistDetails } from './types';
import { ApiClient, apiClient } from './api-client';

class ArtistsApi {
    constructor(private client: ApiClient) {}

    async getArtists(): Promise<ApiResponse<ArtistDetails[]>> {
        return this.client.request<ArtistDetails[]>('/admin/artists');
    }

    async getArtist(id: string): Promise<ApiResponse<ArtistDetails>> {
        return this.client.request<ArtistDetails>(`/admin/artists/${id}`);
    }

    async updateArtist(id: string, artistData: Partial<ArtistDetails>): Promise<ApiResponse<ArtistDetails>> {
        return this.client.request<ArtistDetails>(`/admin/artists/${id}`, {
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

    /**
     * Admin: Recrawl a single artist with custom context
     * @param data { id, name, spotifyId, context }
     */
    async recrawlArtist(data: { id: string; name?: string | undefined; spotifyId?: string | undefined; context?: string | undefined }): Promise<ApiResponse<ArtistDetails>> {
        return this.client.request<ArtistDetails>('/admin/crawl-artist', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}

export const artistsApi = new ArtistsApi(apiClient);
