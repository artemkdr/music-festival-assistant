import { apiClient } from '@/app/lib/api-client/client';
import { type ApiResponse } from '@/app/lib/api-client/client';

class LocaleApi {
    constructor(private client = apiClient) {}

    async setLocale(locale: string): Promise<ApiResponse<string>> {
        return this.client.request<string>('/set-locale', {
            method: 'POST',
            body: JSON.stringify({ locale }),
        });
    }
}

export const localeApi = new LocaleApi();
