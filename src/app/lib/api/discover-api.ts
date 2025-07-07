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
    dates: string[];
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
            cache: 'force-cache', // IMPORTANT: this cache is a client only cache, not a server cache
            next: {
                revalidate: 3 * 24 * 60, // Revalidate every 3 days
            },
        });
    }

    /**
     * Get all public festivals for discovery search
     * @returns {Promise<{status: string, data: FestivalInfo[]}>}
     */
    async getFestivals() {
        return apiClient.request<FestivalInfo[]>('/discover/festivals', {
            cache: 'force-cache', // IMPORTANT: this cache is a client only cache, not a server cache
            next: {
                revalidate: 3 * 24 * 60, // Revalidate every 3 days
            },
        });
    }

    /**
     * Get genres for a festival, sorted by popularity in lineup
     * @param {string} festivalId
     * @returns {Promise<{status: string, data: { name: string, count: number }[]}>}
     */
    async getFestivalGenres(festivalId: string, date?: string | undefined) {
        return apiClient.request<
            {
                name: string;
                count: number;
            }[]
        >(`/discover/festivals/${festivalId}/genres${date ? `?date=${date}` : ''}`, {
            cache: 'force-cache', // IMPORTANT: this cache is a client only cache, not a server cache
            next: {
                revalidate: 3 * 24 * 60, // Revalidate every 3 days
            },
        });
    }

    /**
     * Public: Get festival by ID (public endpoint, no admin required)
     */
    async getPublicFestival(id: string): Promise<ApiResponse<Festival>> {
        return this.client.request<Festival>(`/discover/festivals/${id}`, {
            cache: 'force-cache', // IMPORTANT: this cache is a client only cache, not a server cache
            next: {
                revalidate: 3 * 24 * 60, // Revalidate every 3 days
            },
        });
    }
}

export const discoverApi = new DiscoverApi(apiClient);
