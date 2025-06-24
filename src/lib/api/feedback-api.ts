import { apiClient, ApiClient } from './api-client';
import type { ApiResponse } from './types';

class FeedbackApi {
    constructor(private client: ApiClient) {}

    /**
     * Submit user feedback
     */
    async submitFeedback(feedback: { recommendationId: string; artistId: string; rating: number; sessionId: string }): Promise<ApiResponse> {
        return this.client.request('/feedback', {
            method: 'POST',
            body: JSON.stringify(feedback),
        });
    }
}

export const feedbackApi = new FeedbackApi(apiClient);
