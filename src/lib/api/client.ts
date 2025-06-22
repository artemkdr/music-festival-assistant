/**
 * Common API client library for frontend to backend communication
 * Handles authentication tokens and provides type-safe API methods
 */

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
    status: 'success' | 'error' | 'partial_success';
    message: string;
    data?: T;
    errors?: Array<{ field: string; message: string }>;
}

/**
 * Auth-related types
 */
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        name: string;
        role: 'admin' | 'user';
        preferences?: {
            genres?: string[];
            location?: string;
        };
    };
    token: string;
    refreshToken?: string;
}

/**
 * API client class
 */
export class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string = '/api') {
        this.baseUrl = baseUrl;

        // Try to load token from localStorage if available
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('auth_token');
        }
    }

    /**
     * Set authentication token
     */
    setToken(token: string): void {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
        }
    }

    /**
     * Clear authentication token
     */
    clearToken(): void {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
        }
    }

    /**
     * Get current token
     */
    getToken(): string | null {
        return this.token;
    }

    /**
     * Make authenticated API request
     */
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        // Add auth header if token is available
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        const data = await response.json();
        return data as ApiResponse<T>;
    }

    /**
     * Login user
     */
    async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
        const response = await this.request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        // Store token if login successful
        if (response.status === 'success' && response.data?.token) {
            this.setToken(response.data.token);
        }

        return response;
    }

    /**
     * Register user
     */
    async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
        const response = await this.request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });

        // Store token if registration successful
        if (response.status === 'success' && response.data?.token) {
            this.setToken(response.data.token);
        }

        return response;
    }

    /**
     * Logout user
     */
    async logout(): Promise<void> {
        // Optional: call logout endpoint to invalidate token on server
        if (this.token) {
            try {
                await this.request('/auth/logout', { method: 'POST' });
            } catch (error) {
                console.warn('Logout endpoint failed, clearing token locally:', error);
            }
        }

        this.clearToken();
    }

    /**
     * Get current user profile
     */
    async getProfile(): Promise<ApiResponse<AuthResponse['user']>> {
        return this.request<AuthResponse['user']>('/auth/profile');
    }

    /**
     * Admin: Crawl festival
     */
    async crawlFestival(url: string): Promise<ApiResponse> {
        return this.request('/admin/crawl-festival', {
            method: 'POST',
            body: JSON.stringify({ url }),
        });
    }

    /**
     * Admin: Crawl artists
     */
    async crawlArtists(data: { festivalId?: string; artistNames?: string[] }): Promise<ApiResponse> {
        return this.request('/admin/crawl-artists', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Get festival recommendations
     */
    async getFestivalRecommendations(preferences: unknown): Promise<ApiResponse> {
        return this.request('/festivals/discover', {
            method: 'POST',
            body: JSON.stringify(preferences),
        });
    }

    /**
     * Submit user feedback
     */
    async submitFeedback(feedback: { recommendationId: string; artistId: string; rating: number; sessionId: string }): Promise<ApiResponse> {
        return this.request('/feedback', {
            method: 'POST',
            body: JSON.stringify(feedback),
        });
    }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();
