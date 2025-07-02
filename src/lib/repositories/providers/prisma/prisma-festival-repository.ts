import { IFestivalRepository } from '@/lib/repositories/interfaces';
import { BasePrismaRepository } from '@/lib/repositories/providers/prisma/base-prisma-repository';
import { Festival } from '@/lib/schemas';
import type { ILogger } from '@/lib/types/logger';
/**
 * Prisma festival repository implementation
 */
export class PrismaFestivalRepository extends BasePrismaRepository implements IFestivalRepository {
    constructor(logger: ILogger) {
        super(logger, 'festivals', {
            defaultTtl: 10 * 60 * 1000, // 10 minutes for festivals
            maxSize: 500,
            enabled: true,
        });

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
                return festival;
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
                return festival;
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
                return festivals;
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
            return savedFestival;
        } catch (error) {
            this.handleDatabaseError(error, `saving festival: ${festival.id}`);
        }
    }
}
