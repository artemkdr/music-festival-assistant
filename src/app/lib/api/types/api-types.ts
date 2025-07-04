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
