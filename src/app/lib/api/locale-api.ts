import { apiClient, ApiClient } from '@/app/lib/api/api-client';
import { ApiResponse } from '@/app/lib/api/types';

class LocaleApi {
    constructor(private client: ApiClient) {}

    async setLocale(locale: string): Promise<ApiResponse<string>> {
        return this.client.request<string>('/set-locale', {
            method: 'POST',
            body: JSON.stringify({ locale }),
        });
    }
}

export const localeApi = new LocaleApi(apiClient);
