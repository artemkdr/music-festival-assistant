/**
 * @fileoverview Error handling utilities and middleware.
 * @author github/artemkdr
 */

import { ILogger } from '@/lib/logger';
import { ICircuitBreaker, IErrorHandler, IRetryHandler } from '@/types/error-types';

/**
 * Custom error classes for specific error types.
 */
export class TranscriptionError extends Error {
    constructor(
        message: string,
        public readonly recordingId?: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'TranscriptionError';
    }
}

export class StorageError extends Error {
    constructor(
        message: string,
        public readonly fileName?: string,
        public readonly storageType?: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'StorageError';
    }
}

export class APIError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly service?: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'APIError';
    }
}

export class ConfigurationError extends Error {
    constructor(
        message: string,
        public readonly configKey?: string
    ) {
        super(message);
        this.name = 'ConfigurationError';
    }
}

/**
 * Retry utility with exponential backoff.
 */
export class RetryHandler implements IRetryHandler {
    constructor(
        private readonly logger: ILogger,
        private readonly maxAttempts: number = 3,
        private readonly baseDelayMs: number = 1000
    ) {}

    async execute<T>(operation: () => Promise<T>, operationName: string, shouldRetry: (error: Error) => boolean = () => true): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt === this.maxAttempts || !shouldRetry(lastError)) {
                    this.logger.error(`${operationName} failed after ${attempt} attempts:`, lastError);
                    throw lastError;
                }

                const delayMs = this.baseDelayMs * Math.pow(2, attempt - 1);
                this.logger.warn(`${operationName} failed (attempt ${attempt}/${this.maxAttempts}), retrying in ${delayMs}ms:`, lastError.message);

                await this.delay(delayMs);
            }
        }

        throw lastError!;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Circuit breaker pattern implementation.
 */
export class CircuitBreaker implements ICircuitBreaker {
    private failures = 0;
    private lastFailureTime?: number | undefined;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(
        private readonly logger: ILogger,
        private readonly failureThreshold: number = 5,
        private readonly resetTimeoutMs: number = 60000
    ) {}

    async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
        if (this.state === 'OPEN') {
            if (this.shouldAttemptReset()) {
                this.state = 'HALF_OPEN';
                this.logger.info(`Circuit breaker for ${operationName} is half-open, attempting reset`);
            } else {
                throw new Error(`Circuit breaker is open for ${operationName}`);
            }
        }

        try {
            const result = await operation();
            this.onSuccess(operationName);
            return result;
        } catch (error) {
            this.onFailure(operationName, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    private shouldAttemptReset(): boolean {
        return this.lastFailureTime !== undefined && Date.now() - this.lastFailureTime >= this.resetTimeoutMs;
    }

    private onSuccess(operationName: string): void {
        this.failures = 0;
        this.lastFailureTime = undefined;
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
            this.logger.info(`Circuit breaker for ${operationName} reset to closed`);
        }
    }

    private onFailure(operationName: string, error: Error): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            this.logger.error(`Circuit breaker for ${operationName} opened due to ${this.failures} failures:`, error);
        }
    }

    getState() {
        return this.state;
    }

    getFailureCount(): number {
        return this.failures;
    }
}

/**
 * Error handler utility functions.
 */
export class ErrorHandler implements IErrorHandler {
    constructor(private readonly logger: ILogger) {}

    /**
     * Handle and categorize errors from API calls.
     */
    handleAPIError(error: unknown, service: string, operation: string): never {
        if (typeof error === 'object' && error !== null && 'response' in error) {
            // HTTP error response
            const err = error as { response: { status: number; data?: { message?: string } }; message?: string };
            const statusCode = err.response.status;
            const message = err.response.data?.message || err.message || 'Unknown API error';
            throw new APIError(`${service} ${operation} failed: ${message}`, statusCode, service, error instanceof Error ? error : undefined);
        } else if (typeof error === 'object' && error !== null && 'request' in error) {
            // Network error
            throw new APIError(`${service} ${operation} failed: Network error`, undefined, service, error instanceof Error ? error : undefined);
        } else {
            // Other error
            const errMsg = typeof error === 'object' && error && 'message' in error ? (error as { message: string }).message : 'Unknown error';
            throw new APIError(`${service} ${operation} failed: ${errMsg}`, undefined, service, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Handle transcription-specific errors.
     */
    handleTranscriptionError(error: unknown, recordingId: string): never {
        if (error instanceof TranscriptionError) {
            throw error;
        }

        const message = typeof error === 'object' && error && 'message' in error ? (error as { message: string }).message : 'Unknown transcription error';
        throw new TranscriptionError(`Transcription failed for recording ${recordingId}: ${message}`, recordingId, error instanceof Error ? error : undefined);
    }

    /**
     * Handle storage-specific errors.
     */
    handleStorageError(error: unknown, fileName: string, storageType: string): never {
        if (error instanceof StorageError) {
            throw error;
        }

        const message = typeof error === 'object' && error && 'message' in error ? (error as { message: string }).message : 'Unknown storage error';
        throw new StorageError(`Storage operation failed for ${fileName}: ${message}`, fileName, storageType, error instanceof Error ? error : undefined);
    }

    /**
     * Safely handle promises with error logging.
     */
    async safeExecute<T>(operation: () => Promise<T>, operationName: string, defaultValue?: T): Promise<T | undefined> {
        try {
            return await operation();
        } catch (error) {
            this.logger.error(`Safe execution of ${operationName} failed:`, error as Error);
            return defaultValue;
        }
    }

    /**
     * Format error for user-friendly display.
     */
    formatError(error: Error): { message: string; type: string; details?: unknown } {
        if (error instanceof TranscriptionError) {
            return {
                message: `Transcription failed${error.recordingId ? ` for recording ${error.recordingId}` : ''}`,
                type: 'transcription',
                details: { recordingId: error.recordingId },
            };
        }

        if (error instanceof StorageError) {
            return {
                message: `Storage operation failed${error.fileName ? ` for file ${error.fileName}` : ''}`,
                type: 'storage',
                details: { fileName: error.fileName, storageType: error.storageType },
            };
        }

        if (error instanceof APIError) {
            return {
                message: `API error${error.service ? ` from ${error.service}` : ''}`,
                type: 'api',
                details: { service: error.service, statusCode: error.statusCode },
            };
        }

        if (error instanceof ConfigurationError) {
            return {
                message: 'Configuration error',
                type: 'configuration',
                details: { configKey: error.configKey },
            };
        }

        return {
            message: error.message || 'Unknown error',
            type: 'unknown',
        };
    }
}
