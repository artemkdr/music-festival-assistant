/**
 * Logger interface and implementation using tslog
 * Following dependency injection pattern for loose coupling
 */

/**
 * Logger interface for dependency injection
 */
export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error, ...args: unknown[]): void;
}

/**
 * Logger implementation using tslog
 */
export class Logger implements ILogger {
  private logger: any; // Using any temporarily until tslog is installed

  constructor(name?: string) {
    // Will be implemented properly once tslog is installed
    this.logger = {
      debug: (msg: string, ...args: unknown[]) => console.debug(`[DEBUG] ${msg}`, ...args),
      info: (msg: string, ...args: unknown[]) => console.info(`[INFO] ${msg}`, ...args),
      warn: (msg: string, ...args: unknown[]) => console.warn(`[WARN] ${msg}`, ...args),
      error: (msg: string, error?: Error, ...args: unknown[]) => 
        console.error(`[ERROR] ${msg}`, error, ...args),
    };
  }

  debug(message: string, ...args: unknown[]): void {
    this.logger.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.logger.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.logger.warn(message, ...args);
  }

  error(message: string, error?: Error, ...args: unknown[]): void {
    this.logger.error(message, error, ...args);
  }
}

/**
 * Factory function to create logger instances
 */
export function createLogger(name?: string): ILogger {
  return new Logger(name);
}
