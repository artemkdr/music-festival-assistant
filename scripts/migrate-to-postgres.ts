/**
 * Migration script to transfer JSON data to PostgreSQL
 *
 * This script reads the local JSON files for artists and festivals
 * and migrates them to the Neon PostgreSQL database.
 *
 * Usage:
 *   npm run migrate-to-postgres
 *   or
 *   tsx scripts/migrate-to-postgres.ts
 *
 * Environment Variables Required:
 *   DATABASE_URL - Neon PostgreSQL connection string
 */

import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { NeonArtistRepository } from '../src/lib/repositories/providers/postgres/neon-artist-repository';
import { NeonFestivalRepository } from '../src/lib/repositories/providers/postgres/neon-festival-repository';
import { Artist, Festival } from '../src/lib/schemas';
import { createAppLogger } from '../src/lib/utils/logger';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const ARTISTS_FILE = path.join(DATA_DIR, 'artists', 'artists.json');
const FESTIVALS_FILE = path.join(DATA_DIR, 'festivals', 'festivals.json');

interface MigrationStats {
    artistsProcessed: number;
    artistsCreated: number;
    artistsUpdated: number;
    artistsSkipped: number;
    festivalsProcessed: number;
    festivalsCreated: number;
    festivalsUpdated: number;
    festivalsSkipped: number;
    errors: string[];
}

/**
 * Migration script class
 */
class JsonToPostgresMigration {
    private logger = createAppLogger({
        level: 'info',
        name: 'Migration',
        logToFile: false,
    });
    private artistRepo: NeonArtistRepository;
    private festivalRepo: NeonFestivalRepository;
    private stats: MigrationStats;

    constructor() {
        this.artistRepo = new NeonArtistRepository(this.logger);
        this.festivalRepo = new NeonFestivalRepository(this.logger);
        this.stats = {
            artistsProcessed: 0,
            artistsCreated: 0,
            artistsUpdated: 0,
            artistsSkipped: 0,
            festivalsProcessed: 0,
            festivalsCreated: 0,
            festivalsUpdated: 0,
            festivalsSkipped: 0,
            errors: [],
        };
    }

    /**
     * Validate environment and prerequisites
     */
    private async validateEnvironment(): Promise<void> {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }

        // Check if JSON files exist
        try {
            await fs.access(ARTISTS_FILE);
            this.logger.info(`Artists file found: ${ARTISTS_FILE}`);
        } catch {
            throw new Error(`Artists file not found: ${ARTISTS_FILE}`);
        }

        try {
            await fs.access(FESTIVALS_FILE);
            this.logger.info(`Festivals file found: ${FESTIVALS_FILE}`);
        } catch {
            throw new Error(`Festivals file not found: ${FESTIVALS_FILE}`);
        }
    }

    /**
     * Load and parse JSON file
     */
    private async loadJsonFile<T>(filePath: string): Promise<T[]> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            if (!Array.isArray(data)) {
                throw new Error(`Expected array in ${filePath}, got ${typeof data}`);
            }

            return data as T[];
        } catch (error) {
            this.logger.error(`Failed to load JSON file: ${filePath}`, error instanceof Error ? error : String(error));
            throw error;
        }
    }

    /**
     * Generate ID for artist if missing
     */
    private generateArtistId(artist: Artist): string {
        if (artist.id) {
            return artist.id;
        }

        // Generate ID from name
        const normalized = artist.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        return `artist-${normalized}-${Date.now()}`;
    }

    /**
     * Migrate artists from JSON to PostgreSQL
     */
    private async migrateArtists(): Promise<void> {
        this.logger.info('Starting artists migration...');

        const artistsData = await this.loadJsonFile<Artist>(ARTISTS_FILE);
        this.logger.info(`Found ${artistsData.length} artists to migrate`);

        for (const artistData of artistsData) {
            try {
                this.stats.artistsProcessed++;

                // Ensure artist has an ID
                const artistId = this.generateArtistId(artistData);

                // Create Artist object with proper schema
                const artist: Artist = {
                    id: artistId,
                    name: artistData.name,
                    genre: artistData.genre || undefined,
                    description: artistData.description || undefined,
                    imageUrl: artistData.imageUrl || undefined,
                    mappingIds: artistData.mappingIds || undefined,
                    streamingLinks: artistData.streamingLinks || undefined,
                    socialLinks: artistData.socialLinks || undefined,
                    sources: artistData.sources || undefined,
                    popularity: artistData.popularity || undefined,
                };

                // Check if artist already exists
                const existing = await this.artistRepo.getArtistById(artistId);

                await this.artistRepo.saveArtist(artist);

                if (existing) {
                    this.stats.artistsUpdated++;
                    this.logger.debug(`Updated artist: ${artist.name}`);
                } else {
                    this.stats.artistsCreated++;
                    this.logger.debug(`Created artist: ${artist.name}`);
                }

                // Progress reporting
                if (this.stats.artistsProcessed % 100 === 0) {
                    this.logger.info(`Processed ${this.stats.artistsProcessed}/${artistsData.length} artists`);
                }
            } catch (error) {
                this.stats.artistsSkipped++;
                const errorMsg = `Failed to migrate artist ${artistData.name}: ${error instanceof Error ? error.message : String(error)}`;
                this.stats.errors.push(errorMsg);
                this.logger.warn(errorMsg);
            }
        }

        this.logger.info('Artists migration completed', {
            processed: this.stats.artistsProcessed,
            created: this.stats.artistsCreated,
            updated: this.stats.artistsUpdated,
            skipped: this.stats.artistsSkipped,
        });
    }

    /**
     * Migrate festivals from JSON to PostgreSQL
     */
    private async migrateFestivals(): Promise<void> {
        this.logger.info('Starting festivals migration...');

        const festivalsData = await this.loadJsonFile<Festival>(FESTIVALS_FILE);
        this.logger.info(`Found ${festivalsData.length} festivals to migrate`);

        for (const festivalData of festivalsData) {
            try {
                this.stats.festivalsProcessed++;

                // Create Festival object with proper schema
                const festival: Festival = {
                    id: festivalData.id,
                    name: festivalData.name,
                    description: festivalData.description || undefined,
                    location: festivalData.location || undefined,
                    website: festivalData.website || undefined,
                    imageUrl: festivalData.imageUrl || undefined,
                    lineup: festivalData.lineup || [],
                };

                // Check if festival already exists
                const existing = await this.festivalRepo.getFestivalById(festival.id);

                await this.festivalRepo.saveFestival(festival);

                if (existing) {
                    this.stats.festivalsUpdated++;
                    this.logger.debug(`Updated festival: ${festival.name}`);
                } else {
                    this.stats.festivalsCreated++;
                    this.logger.debug(`Created festival: ${festival.name}`);
                }

                // Progress reporting
                if (this.stats.festivalsProcessed % 50 === 0) {
                    this.logger.info(`Processed ${this.stats.festivalsProcessed}/${festivalsData.length} festivals`);
                }
            } catch (error) {
                this.stats.festivalsSkipped++;
                const errorMsg = `Failed to migrate festival ${festivalData.name}: ${error instanceof Error ? error.message : String(error)}`;
                this.stats.errors.push(errorMsg);
                this.logger.warn(errorMsg);
            }
        }

        this.logger.info('Festivals migration completed', {
            processed: this.stats.festivalsProcessed,
            created: this.stats.festivalsCreated,
            updated: this.stats.festivalsUpdated,
            skipped: this.stats.festivalsSkipped,
        });
    }

    /**
     * Print final migration summary
     */
    private printSummary(): void {
        this.logger.info('='.repeat(60));
        this.logger.info('MIGRATION SUMMARY');
        this.logger.info('='.repeat(60));

        this.logger.info('Artists:');
        this.logger.info(`  📊 Processed: ${this.stats.artistsProcessed}`);
        this.logger.info(`  ✅ Created: ${this.stats.artistsCreated}`);
        this.logger.info(`  🔄 Updated: ${this.stats.artistsUpdated}`);
        this.logger.info(`  ⚠️  Skipped: ${this.stats.artistsSkipped}`);

        this.logger.info('Festivals:');
        this.logger.info(`  📊 Processed: ${this.stats.festivalsProcessed}`);
        this.logger.info(`  ✅ Created: ${this.stats.festivalsCreated}`);
        this.logger.info(`  🔄 Updated: ${this.stats.festivalsUpdated}`);
        this.logger.info(`  ⚠️  Skipped: ${this.stats.festivalsSkipped}`);

        if (this.stats.errors.length > 0) {
            this.logger.info(`\n❌ Errors (${this.stats.errors.length}):`);
            this.stats.errors.slice(0, 10).forEach(error => {
                this.logger.info(`  • ${error}`);
            });

            if (this.stats.errors.length > 10) {
                this.logger.info(`  ... and ${this.stats.errors.length - 10} more errors`);
            }
        }

        this.logger.info('='.repeat(60));

        const totalProcessed = this.stats.artistsProcessed + this.stats.festivalsProcessed;
        const totalSuccess = this.stats.artistsCreated + this.stats.artistsUpdated + this.stats.festivalsCreated + this.stats.festivalsUpdated;
        const successRate = totalProcessed > 0 ? ((totalSuccess / totalProcessed) * 100).toFixed(2) : '0';

        this.logger.info(`Migration completed with ${successRate}% success rate`);
    }

    /**
     * Run the complete migration process
     */
    public async run(): Promise<void> {
        const startTime = Date.now();

        try {
            this.logger.info('🚀 Starting JSON to PostgreSQL migration...');

            // Validate environment
            await this.validateEnvironment();

            // Wait for repositories to initialize
            await this.artistRepo.initialize();
            await this.festivalRepo.initialize();

            // Run migrations
            await this.migrateArtists();
            await this.migrateFestivals();

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            this.logger.info(`✅ Migration completed successfully in ${duration}s`);
        } catch (error) {
            this.logger.error('❌ Migration failed', error instanceof Error ? error : String(error));
            throw error;
        } finally {
            this.printSummary();
        }
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    const migration = new JsonToPostgresMigration();

    migration
        .run()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

export { JsonToPostgresMigration };
