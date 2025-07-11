import { type ApiResponse } from '@/app/lib/api-client/client';
import { apiClient } from './client';
import { SpotifyArtist } from '@/lib/services/spotify/spotify-service';

export class SpotifyApi {
    constructor(private client = apiClient) {}

    /**
     * Admin: Search artists on Spotify
     */
    async searchArtists(query: string): Promise<ApiResponse<{ artists: SpotifyArtist[] }>> {
        return this.client.request(`/admin/spotify/search?q=${encodeURIComponent(query)}`);
    }
}

export const spotifyApi = new SpotifyApi();
