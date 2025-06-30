import { Festival, Recommendation, UserPreferences } from '@/lib/schemas';
import { apiClient } from './api-client';
import { ApiResponse } from '@/app/lib/api/types';

export interface FestivalInfo {
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
    artistsCount: number;
}

export interface FestivalDiscoveryResponse {
    festival: Festival;
    recommendations: Recommendation[];
    totalArtists: number;
    totalRecommendations: number;
}

/**
 * Public API for festival discovery (non-admin)
 */
class DiscoverApi {
    constructor(private client = apiClient) {}
    /**
     * Get festival recommendations based on user preferences
     */
    async getRecommendations(festivalId: string, userPreferences: UserPreferences): Promise<ApiResponse<FestivalDiscoveryResponse>> {
        return apiClient.request<FestivalDiscoveryResponse>('/discover/recommendations', {
            method: 'POST',
            body: JSON.stringify({
                festivalId,
                userPreferences,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Get all public festivals for discovery search
     * @returns {Promise<{status: string, data: FestivalInfo[]}>}
     */
    async getFestivals() {
        return apiClient.request<FestivalInfo[]>('/discover/festivals');
    }

    /**
     * Get genres for a festival, sorted by popularity in lineup
     * @param {string} festivalId
     * @returns {Promise<{status: string, data: { name: string, count: number }[]}>}
     */
    async getFestivalGenres(festivalId: string) {
        return apiClient.request<
            {
                name: string;
                count: number;
            }[]
        >(`/discover/festivals/${festivalId}/genres`);
    }
}

export const discoverApi = new DiscoverApi(apiClient);
