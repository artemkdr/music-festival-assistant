export interface ApiResponse<T = unknown> {
    status: 'success' | 'error' | 'partial_success';
    message: string;
    data?: T;
    errors?: Array<{ field: string; message: string }>;
}
