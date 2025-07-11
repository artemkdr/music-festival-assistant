import type { LoginRequest, RegisterRequest } from '@/lib/services/auth';
import { apiClient } from './client';
import { type AuthResponse } from '@/app/lib/api-client/types/auth-types';
import { type ApiResponse } from '@/app/lib/api-client/client';

class AuthApi {
    constructor(private client = apiClient) {}

    async getToken(): Promise<string | null> {
        return this.client.getToken();
    }

    async clearToken(): Promise<void> {
        this.client.clearToken();
    }

    async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
        const response = await this.client.request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
        if (response.status === 'success' && response.data?.token) {
            this.client.setToken(response.data.token);
        }
        return response;
    }

    async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
        const response = await this.client.request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        if (response.status === 'success' && response.data?.token) {
            this.client.setToken(response.data.token);
        }
        return response;
    }

    async logout(): Promise<void> {
        if (this.client.getToken()) {
            try {
                await this.client.request('/auth/logout', { method: 'POST' });
            } catch {
                // Ignore
            }
        }
        this.client.clearToken();
    }

    async getProfile(): Promise<ApiResponse<AuthResponse['user']>> {
        return this.client.request<AuthResponse['user']>('/auth/profile');
    }
}

export const authApi = new AuthApi();
