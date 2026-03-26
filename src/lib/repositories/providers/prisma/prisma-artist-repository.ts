import { IArtistRepository, RepositoryReadOptions } from '@/lib/repositories/interfaces';
import { BasePrismaRepository } from '@/lib/repositories/providers/prisma/base-prisma-repository';
import { Artist } from '@/lib/schemas';
import { ICacheService } from '@/lib/services/cache/interfaces';
import type { ILogger } from '@/lib/types/logger';

/**
 * Prisma artist repository implementation
 */
export class PrismaArtistRepository extends BasePrismaRepository implements IArtistRepository {
    constructor(logger: ILogger, cacheService?: ICacheService) {
        super(logger, 'artists', cacheService);

        // Initialize repository on construction
        this.initialize().catch(error => {
            this.logger.error('Failed to initialize artist repository during construction', error instanceof Error ? error : String(error));
        });
    }

    async getArtistById(id: string, options?: RepositoryReadOptions): Promise<Artist | null> {
        return this.executeOperation(
            async () => {
                const artist = await this.prisma.artist.findUnique({
                    where: { id },
                });

                if (!artist) {
                    this.logger.info('Artist not found by ID', { id });
                    return null;
                }

                this.logger.info('Artist found by ID', { id, name: artist.name });
                return artist as unknown as Artist;
            },
            'getArtistById',
            {
                cacheKey: this.generateCacheKey('getArtistById', { id }),
                readOptions: options,
            }
        );
    }

    async getArtistsByGenres(genres: string[], options?: RepositoryReadOptions): Promise<Artist[]> {
        return this.executeOperation(
            async () => {
                // For PostgreSQL, we need to use jsonb operations to search in JSON arrays
                const artists = await this.prisma.artist.findMany({
                    where: {
                        AND: genres.map(genre => ({
                            genre: {
                                path: [],
                                array_contains: [genre],
                            },
                        })),
                    },
                    orderBy: { name: 'asc' },
                });

                this.logger.info('Artists found by genres', {
                    genres,
                    foundCount: artists.length,
                });

                return artists as unknown as Artist[];
            },
            'getArtistsByGenres',
            {
                cacheKey: this.generateCacheKey('getArtistsByGenres', { genres }),
                readOptions: options,
            }
        );
    }

    async searchArtistsByName(name: string, options?: RepositoryReadOptions, exact: boolean = true): Promise<Artist[]> {
        return this.executeOperation(
            async () => {
                const whereClause = exact ? { name: { equals: name, mode: 'insensitive' as const } } : { name: { contains: name, mode: 'insensitive' as const } };

                const artists = await this.prisma.artist.findMany({
                    where: whereClause,
                    orderBy: { name: 'asc' },
                });

                this.logger.info('Artists found by name search', {
                    name,
                    exact,
                    foundCount: artists.length,
                });

                return artists as unknown as Artist[];
            },
            'searchArtistsByName',
            {
                cacheKey: this.generateCacheKey('searchArtistsByName', { name, exact }),
                readOptions: options,
            }
        );
    }

    async searchArtistByName(name: string, options?: RepositoryReadOptions): Promise<Artist | null> {
        const artists = await this.searchArtistsByName(name, options, true);
        if (artists.length > 0 && artists[0]) {
            this.logger.info('Artist found by exact name', { name, artistId: artists[0].id });
            return artists[0] as unknown as Artist;
        }

        this.logger.info('No artist found by exact name', { name });
        return null;
    }

    async getAllArtists(options?: RepositoryReadOptions): Promise<Artist[]> {
        return this.executeOperation(
            async () => {
                const artists = await this.prisma.artist.findMany({
                    orderBy: { name: 'asc' },
                });

                this.logger.info('Retrieved all artists from database', { count: artists.length });
                return artists as unknown as Artist[];
            },
            'getAllArtists',
            {
                cacheKey: this.generateCacheKey('getAllArtists'),
                readOptions: options,
            }
        );
    }

    async getArtistsByIds(ids: string[], options?: RepositoryReadOptions): Promise<Artist[]> {
        return this.executeOperation(
            async () => {
                const artists = await this.prisma.artist.findMany({
                    where: {
                        id: { in: ids },
                    },
                    orderBy: { name: 'asc' },
                });
                this.logger.info('Retrieved artists by IDs', { ids, count: artists.length });
                return artists as unknown as Artist[];
            },
            'getArtistsByIds',
            {
                cacheKey: this.generateCacheKey('getArtistsByIds', { ids }),
                readOptions: options,
            }
        );
    }

    async toNullable(value: unknown) {
        if (value === undefined) {
            return null;
        }
        return value;
    }

    async saveArtist(artist: Artist): Promise<Artist> {
        try {
            const savedArtist = await this.prisma.artist.upsert({
                where: { id: artist.id },
                update: {
                    name: artist.name,
                    genre: artist.genre ?? [],
                    description: artist.description ?? null,
                    imageUrl: artist.imageUrl ?? null,
                    mappingIds: artist.mappingIds ?? {},
                    streamingLinks: artist.streamingLinks ?? {},
                    socialLinks: artist.socialLinks ?? {},
                    sources: artist.sources ?? {},
                    popularity: artist.popularity ?? {},
                },
                create: {
                    id: artist.id,
                    name: artist.name,
                    genre: artist.genre ?? [],
                    description: artist.description ?? null,
                    imageUrl: artist.imageUrl ?? null,
                    mappingIds: artist.mappingIds ?? {},
                    streamingLinks: artist.streamingLinks ?? {},
                    socialLinks: artist.socialLinks ?? {},
                    sources: artist.sources ?? {},
                    popularity: artist.popularity ?? {},
                },
            });

            await this.invalidateCachePattern('artists:*');

            this.logger.info('Saved artist to database', { artistId: artist.id });
            return savedArtist as unknown as Artist;
        } catch (error) {
            this.handleDatabaseError(error, `saving artist: ${artist.id}`);
        }
    }

    async deleteArtist(id: string): Promise<void> {
        try {
            await this.prisma.artist.delete({
                where: { id },
            });

            await this.invalidateCachePattern('artists:*');

            this.logger.info('Deleted artist from database', { artistId: id });
        } catch (error) {
            this.handleDatabaseError(error, `deleting artist: ${id}`);
        }
    }
}
