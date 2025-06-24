import { ILogger } from '@/lib/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Base class for JSON file repositories
 */
export abstract class BaseJsonRepository {
    protected readonly dataDir: string;

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
     * Read JSON file
     */
    protected async readJsonFile<T>(filename: string): Promise<T[]> {
        const filePath = path.join(this.dataDir, filename);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data) as T[];
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                // File doesn't exist, return empty array
                return [];
            }
            throw error;
        }
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
