import { SpotifyArtist } from '@/lib/services/spotify/spotify-service';
import { apiClient, ApiClient } from './api-client';
import type { ApiResponse } from './types';

export class SpotifyApi {
    constructor(private client: ApiClient) {}

    /**
     * Admin: Search artists on Spotify
     */
    async searchArtists(query: string): Promise<ApiResponse<{ artists: SpotifyArtist[] }>> {
        return this.client.request(`/admin/spotify/search?q=${encodeURIComponent(query)}`);
    }
}

export const spotifyApi = new SpotifyApi(apiClient);
