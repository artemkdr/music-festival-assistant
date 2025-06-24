import { apiClient, ApiClient } from '@/app/lib/api/api-client';
import { ApiResponse } from '@/app/lib/api/types';

/**
 * Admin: Get dashboard statistics
 */
class StatsApi {
    constructor(private client: ApiClient) {}

    async getAdminStats(): Promise<ApiResponse> {
        return this.client.request('/admin/stats');
    }
}

export const statsApi = new StatsApi(apiClient);
