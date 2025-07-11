export interface ApiResponse<T = unknown> {
    status: 'success' | 'error' | 'partial_success';
    message: string;
    data?: T;
    error?: {
        status: number;
        statusText: string;
        details?: string;
    };
}

export class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string = '/api') {
        this.baseUrl = baseUrl;
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('auth_token');
        }
    }

    setToken(token: string): void {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
        }
    }

    clearToken(): void {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
        }
    }

    getToken(): string | null {
        return this.token;
    }

    public async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            // check if the response is 401 Unauthorized
            // and redirect to login or clear token
            if (response.status === 401) {
                this.clearToken();
                if (typeof window !== 'undefined') {
                    window.location.href = '/login'; // Redirect to login page
                }
                throw new Error('Unauthorized access - please log in again.');
            }
            const errorText = await response.text();
            return {
                status: 'error' as const,
                message: `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
                error: {
                    status: response.status,
                    statusText: response.statusText,
                    details: errorText,
                },
            };
        }
        // Check response content type, parse as JSON if it's application/json
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return data as ApiResponse<T>;
        } else {
            // For non-JSON responses, return text as data
            const text = await response.text();
            return { status: 'success' as const, data: text as unknown as T } as ApiResponse<T>;
        }
    }
}

export const apiClient = new ApiClient();
