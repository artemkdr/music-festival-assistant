export interface IErrorHandler {
    handleAPIError(error: unknown, service: string, operation: string): never;
    handleTranscriptionError(error: unknown, recordingId: string): never;
    handleStorageError(error: unknown, fileName: string, storageType: string): never;
    safeExecute<T>(operation: () => Promise<T>, operationName: string, defaultValue?: T): Promise<T | undefined>;
    formatError(error: Error): { message: string; type: string; details?: unknown };
}

export interface IRetryHandler {
    execute<T>(operation: () => Promise<T>, operationName: string, shouldRetry?: (error: Error) => boolean): Promise<T>;
}

export interface ICircuitBreaker {
    execute<T>(operation: () => Promise<T>, operationName: string): Promise<T>;
    getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    getFailureCount(): number;
}
