import type { ApiResponse, SpotifySearchResult } from './types';
import { apiClient, ApiClient } from './api-client';

export class SpotifyApi {
    constructor(private client: ApiClient) {}

    async searchArtists(query: string): Promise<ApiResponse<SpotifySearchResult[]>> {
        return this.client.request<SpotifySearchResult[]>(`/spotify/search?q=${encodeURIComponent(query)}`);
    }
}

export const spotifyApi = new SpotifyApi(apiClient);
