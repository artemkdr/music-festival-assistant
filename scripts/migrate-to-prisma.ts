import fs from 'fs';
import path from 'path';
import { Artist, Festival } from '@/lib/schemas';
import { createAppLogger } from '@/lib/utils/logger';
import { PrismaArtistRepository, PrismaFestivalRepository } from '@/lib/repositories/providers/prisma';

// load environment variables
import { config } from 'dotenv';
config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Migration statistics interface
 */
interface MigrationStats {
    processed: number;
    created: number;
    updated: number;
    skipped: number;
}

/**
 * JSON to Prisma migration class
 */
class JsonToPrismaMigration {
    private logger = createAppLogger({ level: 'info', name: 'JsonToPrismaMigration' });
    private artistRepository: PrismaArtistRepository;
    private festivalRepository: PrismaFestivalRepository;

    private artistStats: MigrationStats = { processed: 0, created: 0, updated: 0, skipped: 0 };
    private festivalStats: MigrationStats = { processed: 0, created: 0, updated: 0, skipped: 0 };

    constructor() {
        this.artistRepository = new PrismaArtistRepository(this.logger);
        this.festivalRepository = new PrismaFestivalRepository(this.logger);
    }

    /**
     * Load and validate JSON data files
     */
    private async loadJsonData(): Promise<{ artists: Artist[]; festivals: Festival[] }> {
        const dataDir = path.resolve(process.cwd(), 'data');
        const artistsFile = path.join(dataDir, 'artists', 'artists.json');
        const festivalsFile = path.join(dataDir, 'festivals', 'festivals.json');

        // Check if files exist
        if (!fs.existsSync(artistsFile)) {
            throw new Error(`Artists file not found: ${artistsFile}`);
        }

        if (!fs.existsSync(festivalsFile)) {
            throw new Error(`Festivals file not found: ${festivalsFile}`);
        }

        this.logger.info(`Artists file found: ${artistsFile}`);
        this.logger.info(`Festivals file found: ${festivalsFile}`);

        // Load and parse JSON files
        const artistsData = JSON.parse(fs.readFileSync(artistsFile, 'utf-8'));
        const festivalsData = JSON.parse(fs.readFileSync(festivalsFile, 'utf-8'));

        // Validate data structure
        if (!Array.isArray(artistsData)) {
            throw new Error('Artists data is not an array');
        }

        if (!Array.isArray(festivalsData)) {
            throw new Error('Festivals data is not an array');
        }

        this.logger.info(`Loaded ${artistsData.length} artists and ${festivalsData.length} festivals from JSON files`);

        return { artists: artistsData, festivals: festivalsData };
    }

    /**
     * Migrate artists from JSON to Prisma
     */
    private async migrateArtists(artists: Artist[]): Promise<void> {
        this.logger.info(`🎵 Starting artists migration...`);

        for (const artist of artists) {
            try {
                this.artistStats.processed++;

                // Check if artist already exists
                const existingArtist = await this.artistRepository.getArtistById(artist.id);

                if (existingArtist) {
                    // Update existing artist
                    await this.artistRepository.saveArtist(artist);
                    this.artistStats.updated++;
                    this.logger.debug(`Updated artist: ${artist.name} (${artist.id})`);
                } else {
                    // Create new artist
                    await this.artistRepository.saveArtist(artist);
                    this.artistStats.created++;
                    this.logger.debug(`Created artist: ${artist.name} (${artist.id})`);
                }

                // Log progress every 50 records
                if (this.artistStats.processed % 50 === 0) {
                    this.logger.info(`Artists progress: ${this.artistStats.processed}/${artists.length} processed`);
                }
            } catch (error) {
                this.artistStats.skipped++;
                this.logger.warn(`Failed to migrate artist ${artist.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        this.logger.info(`✅ Artists migration completed!`);
    }

    /**
     * Migrate festivals from JSON to Prisma
     */
    private async migrateFestivals(festivals: Festival[]): Promise<void> {
        this.logger.info(`🎪 Starting festivals migration...`);

        for (const festival of festivals) {
            try {
                this.festivalStats.processed++;

                // Check if festival already exists
                const existingFestival = await this.festivalRepository.getFestivalById(festival.id);

                if (existingFestival) {
                    // Update existing festival
                    await this.festivalRepository.saveFestival(festival);
                    this.festivalStats.updated++;
                    this.logger.debug(`Updated festival: ${festival.name} (${festival.id})`);
                } else {
                    // Create new festival
                    await this.festivalRepository.saveFestival(festival);
                    this.festivalStats.created++;
                    this.logger.debug(`Created festival: ${festival.name} (${festival.id})`);
                }

                // Log progress every 10 records
                if (this.festivalStats.processed % 10 === 0) {
                    this.logger.info(`Festivals progress: ${this.festivalStats.processed}/${festivals.length} processed`);
                }
            } catch (error) {
                this.festivalStats.skipped++;
                this.logger.warn(`Failed to migrate festival ${festival.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        this.logger.info(`✅ Festivals migration completed!`);
    }

    /**
     * Print migration summary
     */
    private printSummary(): void {
        this.logger.info('============================================================');
        this.logger.info('MIGRATION SUMMARY');
        this.logger.info('============================================================');
        this.logger.info('Artists:');
        this.logger.info(`  📊 Processed: ${this.artistStats.processed}`);
        this.logger.info(`  ✅ Created: ${this.artistStats.created}`);
        this.logger.info(`  🔄 Updated: ${this.artistStats.updated}`);
        this.logger.info(`  ⚠️  Skipped: ${this.artistStats.skipped}`);
        this.logger.info('Festivals:');
        this.logger.info(`  📊 Processed: ${this.festivalStats.processed}`);
        this.logger.info(`  ✅ Created: ${this.festivalStats.created}`);
        this.logger.info(`  🔄 Updated: ${this.festivalStats.updated}`);
        this.logger.info(`  ⚠️  Skipped: ${this.festivalStats.skipped}`);
        this.logger.info('============================================================');

        const totalProcessed = this.artistStats.processed + this.festivalStats.processed;
        const totalSuccessful = this.artistStats.created + this.artistStats.updated + this.festivalStats.created + this.festivalStats.updated;
        const successRate = totalProcessed > 0 ? Math.round((totalSuccessful / totalProcessed) * 100) : 0;

        this.logger.info(`Migration completed with ${successRate}% success rate`);
    }

    /**
     * Run the complete migration process
     */
    async run(): Promise<void> {
        try {
            this.logger.info('🚀 Starting JSON to Prisma migration...');

            // Load JSON data
            const { artists, festivals } = await this.loadJsonData();

            // Initialize repositories
            await this.artistRepository.initialize();
            await this.festivalRepository.initialize();

            // Run migrations
            await this.migrateArtists(artists);
            await this.migrateFestivals(festivals);

            // Print summary
            this.printSummary();

            this.logger.info('🎉 Migration completed successfully!');
        } catch (error) {
            this.logger.error('❌ Migration failed', error instanceof Error ? error : String(error));
            this.printSummary();
            throw error;
        }
    }
}

// Run migration if this script is executed directly
const migration = new JsonToPrismaMigration();
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
