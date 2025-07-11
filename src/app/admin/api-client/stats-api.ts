import { apiClient } from '@/app/lib/api-client/client';
import { type ApiResponse } from '@/app/lib/api-client/client';

/**
 * Admin: Get dashboard statistics
 */
class StatsApi {
    constructor(private client = apiClient) {}

    async getAdminStats(): Promise<
        ApiResponse<{
            festivals: number;
            artists: number;
            acts: number;
            activeSessions: number;
        }>
    > {
        return this.client.request('/admin/stats');
    }
}

export const statsApi = new StatsApi();
