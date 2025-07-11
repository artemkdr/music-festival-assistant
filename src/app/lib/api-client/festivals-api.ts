import { type Festival } from '@/lib/schemas';
import { type SpotifyArtist } from '@/lib/services/spotify/spotify-service';
import { apiClient } from './client';
import { type ApiResponse } from '@/app/lib/api-client/client';

class FestivalsApi {
    constructor(private client = apiClient) {}

    async getFestivals(): Promise<ApiResponse<Festival[]>> {
        return this.client.request('/admin/festivals', {
            cache: 'force-cache', // Force cache for this request
            next: {
                tags: ['festivals'], // Tag for cache invalidation
            },
        });
    }

    async getFestival(id: string): Promise<ApiResponse<Festival>> {
        return this.client.request(`/admin/festivals/${id}`, {
            cache: 'force-cache', // Force cache for this request
            next: {
                tags: ['festivals'], // Tag for cache invalidation
            },
        });
    }

    async updateFestival(id: string, festivalData: Partial<Festival>): Promise<ApiResponse<Festival>> {
        return this.client.request<Festival>(`/admin/festivals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(festivalData),
        });
    }

    /**
     * Admin: Crawl festival
     */
    async crawlFestival(data: {
        urls: string[];
        forcedName?: string | undefined;
        files?:
            | {
                  name: string;
                  type: string;
                  base64: string;
              }[]
            | undefined;
    }): Promise<
        ApiResponse<{
            cacheId: string;
            redirect?: string; // URL to redirect to after successful crawl
        }>
    > {
        // Support backward compatibility with single URL string
        const requestBody = typeof data === 'string' ? { urls: [data] } : data;

        // this request returns a 303 redirect to the edit page of the parsed festival
        return this.client.request<{
            cacheId: string;
            redirect?: string; // URL to redirect to after successful crawl
        }>('/admin/crawl/festival', {
            method: 'POST',
            body: JSON.stringify(requestBody),
        });
    }

    /**
     * Admin: Link festival act with artist
     */
    async linkArtistToAct(
        festivalId: string,
        data: {
            actId: string;
            artistName: string; // Use artistName for clarity
            artistId?: string;
            spotifyData?: SpotifyArtist;
        }
    ): Promise<ApiResponse<{ actId: string; artistId: string; linkType: string }>> {
        return this.client.request<{
            actId: string;
            artistId: string;
            linkType: string;
        }>(`/admin/festivals/${festivalId}/link-artist-to-act`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Public: Get festival by ID (public endpoint, no admin required)
     */
    async getFestivalPublic(id: string): Promise<ApiResponse<Festival>> {
        return this.client.request<Festival>(`/discover/festivals/${id}`, {
            cache: 'force-cache', // IMPORTANT: this cache is a client only cache, not a server cache
            next: {
                revalidate: 3 * 24 * 60, // Revalidate every 3 days
            },
        });
    }
}

export const festivalsApi = new FestivalsApi();
