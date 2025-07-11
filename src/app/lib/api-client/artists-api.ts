import { Artist, FestivalAct } from '@/lib/schemas';
import { apiClient, type ApiResponse } from './client';

class ArtistsApi {
    constructor(private client = apiClient) {}

    async getArtists(): Promise<ApiResponse<Artist[]>> {
        return this.client.request<Artist[]>('/admin/artists');
    }

    async getArtist(id: string): Promise<ApiResponse<Artist>> {
        return this.client.request<Artist>(`/admin/artists/${id}`);
    }

    async getArtistPublic(id: string): Promise<ApiResponse<Artist>> {
        return this.client.request<Artist>(`/discover/artists/${id}`);
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
     * Admin: Search artists in database
     */
    async searchArtists(query: string): Promise<ApiResponse<{ artists: Artist[] }>> {
        return this.client.request(`/admin/artists/search?q=${encodeURIComponent(query)}`);
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
     * Admin: Crawl a single artist with custom context
     * Either provide an ID of an existing artist or an artist name.
     * @param data { id, name, spotifyId, context }
     */
    async crawlArtist(data: { id?: string; name?: string | undefined; spotifyId?: string | undefined; context?: string | undefined }): Promise<ApiResponse<Artist>> {
        return this.client.request<Artist>('/admin/crawl/artist', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}

export const artistsApi = new ArtistsApi();
