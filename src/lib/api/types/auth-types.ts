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
