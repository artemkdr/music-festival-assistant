import { IFestivalRepository } from '@/lib/repositories/interfaces';
import { BasePrismaRepository } from '@/lib/repositories/providers/prisma/base-prisma-repository';
import { Festival } from '@/lib/schemas';
import { ICacheService } from '@/lib/services/cache/interfaces';
import type { ILogger } from '@/lib/types/logger';
/**
 * Prisma festival repository implementation
 */
export class PrismaFestivalRepository extends BasePrismaRepository implements IFestivalRepository {
    constructor(logger: ILogger, cacheService?: ICacheService) {
        super(logger, 'festivals', cacheService);

        // Initialize repository on construction
        this.initialize().catch(error => {
            this.logger.error('Failed to initialize festival repository during construction', error instanceof Error ? error : String(error));
        });
    }

    /**
     * Convert Festival schema to Prisma create/update data
     * @param festival Festival schema object
     * @returns Prisma create/update data
     */
    private festivalToPrismaData(festival: Festival) {
        return {
            id: festival.id,
            name: festival.name,
            description: festival.description || null,
            location: festival.location || null,
            website: festival.website || null,
            imageUrl: festival.imageUrl || null,
            lineup: festival.lineup || [],
        };
    }

    async getFestivalById(id: string): Promise<Festival | null> {
        return this.executeOperation(
            async () => {
                const festival = await this.prisma.festival.findUnique({
                    where: { id },
                });

                if (!festival) {
                    this.logger.info('Festival not found by ID', { id });
                    return null;
                }

                this.logger.info('Festival found by ID', { id, name: festival.name });
                return festival as unknown as Festival;
            },
            'getFestivalById',
            this.generateCacheKey('getFestivalById', { id })
        );
    }

    async getFestivalByUrl(url: string): Promise<Festival | null> {
        return this.executeOperation(
            async () => {
                const festival = await this.prisma.festival.findFirst({
                    where: { website: url },
                });

                if (!festival) {
                    this.logger.info('Festival not found by URL', { url });
                    return null;
                }

                this.logger.info('Festival found by URL', { url, id: festival.id, name: festival.name });
                return festival as unknown as Festival;
            },
            'getFestivalByUrl',
            this.generateCacheKey('getFestivalByUrl', { url })
        );
    }

    async getAllFestivals(): Promise<Festival[]> {
        return this.executeOperation(
            async () => {
                const festivals = await this.prisma.festival.findMany({
                    orderBy: { name: 'asc' },
                });

                this.logger.info('Retrieved all festivals from database', { count: festivals.length });
                return festivals as unknown as Festival[];
            },
            'getAllFestivals',
            this.generateCacheKey('getAllFestivals')
        );
    }

    async saveFestival(festival: Festival): Promise<Festival> {
        try {
            const prismaData = this.festivalToPrismaData(festival);

            const savedFestival = await this.prisma.festival.upsert({
                where: { id: festival.id },
                update: {
                    name: prismaData.name,
                    description: prismaData.description,
                    location: prismaData.location,
                    website: prismaData.website,
                    imageUrl: prismaData.imageUrl,
                    lineup: prismaData.lineup,
                },
                create: prismaData,
            });

            // Invalidate cache for this festival
            this.invalidateCachePattern(`festivals:`);
            this.invalidateCachePattern(festival.id);

            this.logger.info('Saved festival to database', { festivalId: festival.id });
            return savedFestival as unknown as Festival;
        } catch (error) {
            this.handleDatabaseError(error, `saving festival: ${festival.id}`);
        }
    }
}
