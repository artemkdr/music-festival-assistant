export interface ILogger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, error?: Error | string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
    trace(message: string, meta?: Record<string, unknown>): void;
}
