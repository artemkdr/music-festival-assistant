import { IFestivalRepository } from '@/lib/repositories/interfaces';
import { BaseNeonRepository } from '@/lib/repositories/providers/postgres/base-neon-repository';
import { Festival } from '@/lib/schemas';
import type { ILogger } from '@/lib/types/logger';

/**
 * Database row interface for festivals table
 */
interface FestivalRow {
    id: string;
    name: string;
    description?: string;
    location?: string;
    website?: string;
    image_url?: string;
    lineup: string; // JSON string
    created_at?: string;
    updated_at?: string;
}

/**
 * Neon PostgreSQL festival repository implementation
 */
export class NeonFestivalRepository extends BaseNeonRepository implements IFestivalRepository {
    constructor(logger: ILogger) {
        super(logger, 'festivals', {
            defaultTtl: 10 * 60 * 1000, // 10 minutes for festivals
            maxSize: 500,
            enabled: true,
        });

        // Initialize tables on construction
        this.initialize().catch(error => {
            this.logger.error('Failed to initialize festival repository during construction', error instanceof Error ? error : String(error));
        });
    }

    /**
     * Convert database row to Festival object
     * @param row Database row
     * @returns Festival object
     */
    private rowToFestival(row: FestivalRow): Festival {
        return {
            id: row.id,
            name: row.name,
            description: row.description || undefined,
            location: row.location || undefined,
            website: row.website || undefined,
            imageUrl: row.image_url || undefined,
            lineup: row.lineup ? JSON.parse(row.lineup) : [],
        };
    }

    /**
     * Convert Festival object to database values
     * @param festival Festival object
     * @returns Database values array
     */
    private festivalToValues(festival: Festival): (string | null)[] {
        return [festival.id, festival.name, festival.description || null, festival.location || null, festival.website || null, festival.imageUrl || null, JSON.stringify(festival.lineup || [])];
    }

    /**
     * Ensure the festivals table exists with the correct schema
     */
    protected async ensureTablesExist(): Promise<void> {
        const tableName = 'festivals';

        if (await this.tableExists(tableName)) {
            this.logger.debug(`Table ${tableName} already exists`);
            return;
        }

        this.logger.info(`Creating ${tableName} table`);

        const createTableQuery = `
            CREATE TABLE festivals (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(500) NOT NULL,
                description TEXT,
                location VARCHAR(500),
                website VARCHAR(1000),
                image_url VARCHAR(1000),
                lineup JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Create indexes for better query performance
            CREATE INDEX IF NOT EXISTS idx_festivals_name ON festivals(name);
            CREATE INDEX IF NOT EXISTS idx_festivals_location ON festivals(location);
            CREATE INDEX IF NOT EXISTS idx_festivals_website ON festivals(website);
            CREATE INDEX IF NOT EXISTS idx_festivals_created_at ON festivals(created_at);
        `;

        await this.executeDDL(createTableQuery, `create ${tableName} table with indexes`);
    }

    /**
     * Initialize the festival repository
     * Call this method during application startup
     */
    public async initialize(): Promise<void> {
        await this.initializeRepository();
    }

    async getFestivalById(id: string): Promise<Festival | null> {
        this.logger.debug('Getting festival by ID from Neon database', { id });

        try {
            const query = `
                SELECT id, name, description, location, website, image_url, lineup, created_at, updated_at
                FROM festivals 
                WHERE id = $1
            `;

            const row = await this.executeQuerySingle<FestivalRow>(query, [id], 'getFestivalById');

            if (!row) {
                this.logger.info('Festival not found by ID', { id });
                return null;
            }

            const festival = this.rowToFestival(row);
            this.logger.info('Festival found by ID', { id, name: festival.name });
            return festival;
        } catch (error) {
            this.handleDatabaseError(error, `getting festival by ID: ${id}`);
        }
    }

    async getFestivalByUrl(url: string): Promise<Festival | null> {
        this.logger.debug('Getting festival by URL from Neon database', { url });

        try {
            const query = `
                SELECT id, name, description, location, website, image_url, lineup, created_at, updated_at
                FROM festivals 
                WHERE website = $1
            `;

            const row = await this.executeQuerySingle<FestivalRow>(query, [url], 'getFestivalByUrl');

            if (!row) {
                this.logger.info('Festival not found by URL', { url });
                return null;
            }

            const festival = this.rowToFestival(row);
            this.logger.info('Festival found by URL', { url, id: festival.id, name: festival.name });
            return festival;
        } catch (error) {
            this.handleDatabaseError(error, `getting festival by URL: ${url}`);
        }
    }

    async getAllFestivals(): Promise<Festival[]> {
        this.logger.debug('Getting all festivals from Neon database');

        try {
            const query = `
                SELECT id, name, description, location, website, image_url, lineup, created_at, updated_at
                FROM festivals 
                ORDER BY name ASC
            `;

            const rows = await this.executeQuery<FestivalRow>(query, [], 'getAllFestivals');
            const festivals = rows.map(row => this.rowToFestival(row));

            this.logger.info('Retrieved all festivals from Neon database', { count: festivals.length });
            return festivals;
        } catch (error) {
            this.handleDatabaseError(error, 'getting all festivals');
        }
    }

    async saveFestival(festival: Festival): Promise<Festival> {
        this.logger.debug('Saving festival to Neon database', { festivalId: festival.id });

        try {
            // Check if festival exists
            const existing = await this.getFestivalById(festival.id);

            if (existing) {
                // Update existing festival
                const query = `
                    UPDATE festivals 
                    SET name = $2, description = $3, location = $4, website = $5, 
                        image_url = $6, lineup = $7, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    RETURNING id, name, description, location, website, image_url, lineup, created_at, updated_at
                `;

                const row = await this.executeQuerySingle<FestivalRow>(
                    query,
                    this.festivalToValues(festival),
                    'updateFestival',
                    undefined,
                    false // Don't cache UPDATE queries
                );

                if (!row) {
                    throw new Error(`Failed to update festival with ID: ${festival.id}`);
                }

                // Invalidate cache for this festival
                this.invalidateCachePattern(`festivals:`);
                this.invalidateCachePattern(festival.id);

                this.logger.info('Updated existing festival in Neon database', { festivalId: festival.id });
                return this.rowToFestival(row);
            } else {
                // Insert new festival
                const query = `
                    INSERT INTO festivals (id, name, description, location, website, image_url, lineup, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id, name, description, location, website, image_url, lineup, created_at, updated_at
                `;

                const row = await this.executeQuerySingle<FestivalRow>(
                    query,
                    this.festivalToValues(festival),
                    'insertFestival',
                    undefined,
                    false // Don't cache INSERT queries
                );

                if (!row) {
                    throw new Error(`Failed to insert festival with ID: ${festival.id}`);
                }

                // Invalidate relevant cache entries
                this.invalidateCachePattern(`festivals:`);

                this.logger.info('Created new festival in Neon database', { festivalId: festival.id });
                return this.rowToFestival(row);
            }
        } catch (error) {
            this.handleDatabaseError(error, `saving festival: ${festival.id}`);
        }
    }
}
