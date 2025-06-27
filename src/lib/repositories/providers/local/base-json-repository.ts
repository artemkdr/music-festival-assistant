import { ILogger } from '@/lib/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Base class for JSON file repositories
 */
export abstract class BaseJsonRepository {
    protected readonly dataDir: string;

    /**
     * In-memory cache for JSON file contents by filename
     */
    private jsonCache: Map<string, unknown[]> = new Map();

    constructor(
        protected readonly logger: ILogger,
        dataSubDir: string
    ) {
        this.dataDir = path.join(process.cwd(), 'data', dataSubDir);
    }

    /**
     * Ensure data directory exists
     */
    protected async ensureDataDir(): Promise<void> {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
            this.logger.info('Created data directory', { dir: this.dataDir });
        }
    }

    /**
     * Read JSON file with in-memory caching by filename
     * @param filename - JSON file name
     * @returns Parsed array of objects from JSON file
     */
    protected async readJsonFile<T>(filename: string): Promise<T[]> {
        if (this.jsonCache.has(filename)) {
            return this.jsonCache.get(filename) as T[];
        }
        const filePath = path.join(this.dataDir, filename);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(data) as T[];
            this.jsonCache.set(filename, parsed);
            return parsed;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                // File doesn't exist, return empty array
                this.jsonCache.set(filename, []);
                return [];
            }
            throw error;
        }
    }

    /**
     * Reset the cache for a specific JSON file by filename
     * @param filename - JSON file name to clear from cache
     */
    protected resetJsonCache(filename: string): void {
        this.jsonCache.delete(filename);
    }

    /**
     * Write JSON file
     */
    protected async writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
        await this.ensureDataDir();
        const filePath = path.join(this.dataDir, filename);
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, jsonData, 'utf-8');
    }

    /**
     * Generate unique ID
     */
    protected generateId(prefix: string): string {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
