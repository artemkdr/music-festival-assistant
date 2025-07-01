import { IArtistRepository } from '@/lib/repositories/interfaces';
import { BaseNeonRepository } from '@/lib/repositories/providers/postgres/base-neon-repository';
import { Artist } from '@/lib/schemas';
import type { ILogger } from '@/lib/types/logger';

/**
 * Database row interface for artists table
 */
interface ArtistRow {
    id: string;
    name: string;
    genre?: string; // JSON array string
    description?: string;
    image_url?: string;
    mapping_ids?: string; // JSON object string
    streaming_links?: string; // JSON object string
    social_links?: string; // JSON object string
    sources?: string; // JSON array string
    popularity?: string; // JSON object string
    created_at?: string;
    updated_at?: string;
}

/**
 * Neon PostgreSQL artist repository implementation
 */
export class NeonArtistRepository extends BaseNeonRepository implements IArtistRepository {
    constructor(logger: ILogger) {
        super(logger, 'artists', {
            defaultTtl: 15 * 60 * 1000, // 15 minutes for artists
            maxSize: 2000,
            enabled: true,
        });

        // Initialize tables on construction
        this.initialize().catch(error => {
            this.logger.error('Failed to initialize artist repository during construction', error instanceof Error ? error : String(error));
        });
    }

    /**
     * Convert database row to Artist object
     * @param row Database row
     * @returns Artist object
     */
    private rowToArtist(row: ArtistRow): Artist {
        return {
            id: row.id,
            name: row.name,
            genre: row.genre ? JSON.parse(row.genre) : undefined,
            description: row.description || undefined,
            imageUrl: row.image_url || undefined,
            mappingIds: row.mapping_ids ? JSON.parse(row.mapping_ids) : undefined,
            streamingLinks: row.streaming_links ? JSON.parse(row.streaming_links) : undefined,
            socialLinks: row.social_links ? JSON.parse(row.social_links) : undefined,
            sources: row.sources ? JSON.parse(row.sources) : undefined,
            popularity: row.popularity ? JSON.parse(row.popularity) : undefined,
        };
    }

    /**
     * Convert Artist object to database values
     * @param artist Artist object
     * @returns Database values array
     */
    private artistToValues(artist: Artist): (string | null)[] {
        return [
            artist.id,
            artist.name,
            artist.genre ? JSON.stringify(artist.genre) : null,
            artist.description || null,
            artist.imageUrl || null,
            artist.mappingIds ? JSON.stringify(artist.mappingIds) : null,
            artist.streamingLinks ? JSON.stringify(artist.streamingLinks) : null,
            artist.socialLinks ? JSON.stringify(artist.socialLinks) : null,
            artist.sources ? JSON.stringify(artist.sources) : null,
            artist.popularity ? JSON.stringify(artist.popularity) : null,
        ];
    }

    /**
     * Ensure the artists table exists with the correct schema
     */
    protected async ensureTablesExist(): Promise<void> {
        const tableName = 'artists';

        if (await this.tableExists(tableName)) {
            this.logger.debug(`Table ${tableName} already exists`);
            return;
        }

        this.logger.info(`Creating ${tableName} table`);

        const createTableQuery = `
            CREATE TABLE artists (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(500) NOT NULL,
                genre JSONB,
                description TEXT,
                image_url VARCHAR(1000),
                mapping_ids JSONB,
                streaming_links JSONB,
                social_links JSONB,
                sources JSONB,
                popularity JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Create indexes for better query performance
            CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
            CREATE INDEX IF NOT EXISTS idx_artists_name_lower ON artists(LOWER(name));
            CREATE INDEX IF NOT EXISTS idx_artists_genre ON artists USING GIN(genre);
            CREATE INDEX IF NOT EXISTS idx_artists_created_at ON artists(created_at);
            
            -- Create index for genre search optimization
            CREATE INDEX IF NOT EXISTS idx_artists_genre_text ON artists USING GIN((genre::text) gin_trgm_ops);
        `;

        await this.executeDDL(createTableQuery, `create ${tableName} table with indexes`);

        // Check if pg_trgm extension exists for better text search
        try {
            const extensionQuery = `CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
            await this.executeDDL(extensionQuery, 'create pg_trgm extension for text search');
        } catch (error) {
            this.logger.warn('Could not create pg_trgm extension, text search may be slower', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Initialize the artist repository
     * Call this method during application startup
     */
    public async initialize(): Promise<void> {
        await this.initializeRepository();
    }

    async getArtistById(id: string): Promise<Artist | null> {
        this.logger.debug('Getting artist by ID from Neon database', { id });

        try {
            const query = `
                SELECT id, name, genre, description, image_url, mapping_ids, 
                       streaming_links, social_links, sources, popularity, created_at, updated_at
                FROM artists 
                WHERE id = $1
            `;

            const row = await this.executeQuerySingle<ArtistRow>(query, [id], 'getArtistById');

            if (!row) {
                this.logger.info('Artist not found by ID', { id });
                return null;
            }

            const artist = this.rowToArtist(row);
            this.logger.info('Artist found by ID', { id, name: artist.name });
            return artist;
        } catch (error) {
            this.handleDatabaseError(error, `getting artist by ID: ${id}`);
        }
    }

    async getArtistsByGenres(genres: string[]): Promise<Artist[]> {
        this.logger.debug('Getting artists by genres from Neon database', { genres });

        try {
            // Create a condition that checks if any of the artist's genres match any of the user's genres (case-insensitive)
            // Convert the genres array to a PostgreSQL array format
            const genresArrayLiteral = `{${genres.map(g => `"${g.replace(/"/g, '\\"')}"`).join(',')}}`;

            const query = `
                SELECT id, name, genre, description, image_url, mapping_ids, 
                       streaming_links, social_links, sources, popularity, created_at, updated_at
                FROM artists 
                WHERE genre IS NOT NULL 
                  AND EXISTS (
                    SELECT 1 
                    FROM jsonb_array_elements_text(genre::jsonb) AS artist_genre
                    WHERE EXISTS (
                      SELECT 1 FROM unnest($1::text[]) AS user_genre
                      WHERE LOWER(artist_genre) LIKE '%' || LOWER(user_genre) || '%' 
                         OR LOWER(user_genre) LIKE '%' || LOWER(artist_genre) || '%'
                    )
                  )
                ORDER BY name ASC
            `;

            const rows = await this.executeQuery<ArtistRow>(query, [genresArrayLiteral], 'getArtistsByGenres');
            const artists = rows.map(row => this.rowToArtist(row));

            this.logger.info('Artists found by genres', {
                genres,
                foundCount: artists.length,
            });

            return artists;
        } catch (error) {
            this.handleDatabaseError(error, `getting artists by genres: ${genres.join(', ')}`);
        }
    }

    async searchArtistsByName(name: string, exact: boolean = true): Promise<Artist[]> {
        this.logger.debug('Searching artists by name in Neon database', { name, exact });

        try {
            const searchTerm = name.toLowerCase();
            let query: string;
            let params: (string | number | boolean | null)[];

            if (exact) {
                query = `
                    SELECT id, name, genre, description, image_url, mapping_ids, 
                           streaming_links, social_links, sources, popularity, created_at, updated_at
                    FROM artists 
                    WHERE LOWER(name) = $1
                    ORDER BY name ASC
                `;
                params = [searchTerm];
            } else {
                query = `
                    SELECT id, name, genre, description, image_url, mapping_ids, 
                           streaming_links, social_links, sources, popularity, created_at, updated_at,
                           -- Calculate matching score for sorting
                           CASE 
                             WHEN LOWER(name) = $1 THEN 0
                             WHEN LOWER(name) LIKE $1 || '%' THEN 1
                             WHEN LOWER(name) LIKE '%' || $1 || '%' THEN 2 + LENGTH(name) - LENGTH($1)
                             ELSE 999
                           END AS match_score
                    FROM artists 
                    WHERE LOWER(name) LIKE '%' || $1 || '%'
                    ORDER BY match_score ASC, name ASC
                `;
                params = [searchTerm];
            }

            const rows = await this.executeQuery<ArtistRow>(query, params, 'searchArtistsByName');
            const artists = rows.map(row => this.rowToArtist(row));

            this.logger.info('Artists found by name search', {
                name,
                exact,
                foundCount: artists.length,
            });

            return artists;
        } catch (error) {
            this.handleDatabaseError(error, `searching artists by name: ${name}`);
        }
    }

    async searchArtistByName(name: string): Promise<Artist | null> {
        this.logger.debug('Searching single artist by name in Neon database', { name });

        const artists = await this.searchArtistsByName(name, true);
        if (artists.length > 0 && artists[0]) {
            this.logger.info('Artist found by exact name', { name, artistId: artists[0].id });
            return artists[0];
        }

        this.logger.info('No artist found by exact name', { name });
        return null;
    }

    async getAllArtists(): Promise<Artist[]> {
        this.logger.debug('Getting all artists from Neon database');

        try {
            const query = `
                SELECT id, name, genre, description, image_url, mapping_ids, 
                       streaming_links, social_links, sources, popularity, created_at, updated_at
                FROM artists 
                ORDER BY name ASC
            `;

            const rows = await this.executeQuery<ArtistRow>(query, [], 'getAllArtists');
            const artists = rows.map(row => this.rowToArtist(row));

            this.logger.info('Retrieved all artists from Neon database', { count: artists.length });
            return artists;
        } catch (error) {
            this.handleDatabaseError(error, 'getting all artists');
        }
    }

    async saveArtist(artist: Artist): Promise<Artist> {
        this.logger.debug('Saving artist to Neon database', { artistId: artist.id });

        try {
            // Check if artist exists
            const existing = await this.getArtistById(artist.id);

            if (existing) {
                // Update existing artist
                const query = `
                    UPDATE artists 
                    SET name = $2, genre = $3, description = $4, image_url = $5, 
                        mapping_ids = $6, streaming_links = $7, social_links = $8, 
                        sources = $9, popularity = $10, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    RETURNING id, name, genre, description, image_url, mapping_ids, 
                              streaming_links, social_links, sources, popularity, created_at, updated_at
                `;

                const row = await this.executeQuerySingle<ArtistRow>(
                    query,
                    this.artistToValues(artist),
                    'updateArtist',
                    undefined,
                    false // Don't cache UPDATE queries
                );

                if (!row) {
                    throw new Error(`Failed to update artist with ID: ${artist.id}`);
                }

                // Invalidate cache for this artist
                this.invalidateCachePattern(`artists:`);
                this.invalidateCachePattern(artist.id);
                this.invalidateCachePattern(artist.name.toLowerCase());

                this.logger.info('Updated existing artist in Neon database', { artistId: artist.id });
                return this.rowToArtist(row);
            } else {
                // Insert new artist
                const query = `
                    INSERT INTO artists (id, name, genre, description, image_url, mapping_ids, 
                                       streaming_links, social_links, sources, popularity, 
                                       created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id, name, genre, description, image_url, mapping_ids, 
                              streaming_links, social_links, sources, popularity, created_at, updated_at
                `;

                const row = await this.executeQuerySingle<ArtistRow>(
                    query,
                    this.artistToValues(artist),
                    'insertArtist',
                    undefined,
                    false // Don't cache INSERT queries
                );

                if (!row) {
                    throw new Error(`Failed to insert artist with ID: ${artist.id}`);
                }

                // Invalidate relevant cache entries
                this.invalidateCachePattern(`artists:`);

                this.logger.info('Created new artist in Neon database', { artistId: artist.id });
                return this.rowToArtist(row);
            }
        } catch (error) {
            this.handleDatabaseError(error, `saving artist: ${artist.id}`);
        }
    }

    async deleteArtist(id: string): Promise<void> {
        this.logger.debug('Deleting artist from Neon database', { artistId: id });

        try {
            const query = `
                DELETE FROM artists 
                WHERE id = $1
            `;

            await this.executeQuery(query, [id], 'deleteArtist', undefined, false);

            // Invalidate cache entries for this artist
            this.invalidateCachePattern(`artists:`);
            this.invalidateCachePattern(id);

            this.logger.info('Deleted artist from Neon database', { artistId: id });
        } catch (error) {
            this.handleDatabaseError(error, `deleting artist: ${id}`);
        }
    }
}
