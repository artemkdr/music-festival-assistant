import { IFestivalService } from '@/lib/services/festival-service';
import { ILogger } from '@/lib/types/logger';
import { revalidateTag } from 'next/cache';

export interface INextCacheService {
    festivalCreated(): Promise<void>;
    festivalUpdated(festivalId: string): Promise<void>;
    festivalDeleted(festivalId: string): Promise<void>;
    artistCreated(artistId: string): Promise<void>;
    artistUpdated(artistId: string): Promise<void>;
    artistWillBeDeleted(artistId: string): Promise<void>;
}

/**
 * Service for managing Next.js cache for festival and artist data
 */
export class NextCacheService implements INextCacheService {
    constructor(
        private readonly festivalService: IFestivalService,
        private readonly logger: ILogger
    ) {}

    /**
     * Invalidate cache when a new festival is created.
     * This will clear the global festivals cache.
     */
    async festivalCreated(): Promise<void> {
        this.logger.info(`Invalidating cache for festivals`);
        // Invalidate cache for festivals
        revalidateTag('festivals');
    }

    /**
     * Invalidate cache when a festival is updated,
     * this includes updating the recommendations for this festival and the global festivals cache.
     * @param festivalId - ID of the updated festival
     */
    async festivalUpdated(festivalId: string): Promise<void> {
        this.logger.info(`Invalidating cache for festival: ${festivalId}`);
        // Invalidate cache for festivals
        revalidateTag('festivals');
        // Invalidate cache for recommendations for this festival
        revalidateTag(`recommendations:${festivalId}`);
    }

    /**
     * Invalidate cache when a festival is deleted.
     * It will clear the global festivals cache.
     * @param festivalId - ID of the festival that will be deleted
     */
    async festivalDeleted(festivalId: string): Promise<void> {
        this.logger.info(`Invalidating cache for deleted festival: ${festivalId}`);
        // Invalidate cache for festivals
        revalidateTag('festivals');
    }

    /**
     * Invalidate cache when a new artist is created,
     * this includes updating the recommendations for the festivals where this artist is performing.
     *
     * @param artistId - ID of the newly created artist
     */
    async artistCreated(artistId: string): Promise<void> {
        this.logger.info(`Invalidating cache for a new artist: ${artistId}`);

        // Invalidate cache for recommendations for all festivals where this artist is performing
        const festivals = await this.festivalService.getAllFestivals();
        festivals.forEach(festival => {
            if (festival.lineup.some(act => act.artistId === artistId)) {
                revalidateTag(`recommendations:${festival.id}`);
            }
        });
    }

    /**
     * Invalidate cache when an artist is updated,
     * it includes updating the artist's information and recommendations for the festivals where this artist is performing.
     * @param artistId - ID of the updated artist
     */
    async artistUpdated(artistId: string): Promise<void> {
        this.logger.info(`Invalidating cache for artist: ${artistId}`);
        // Invalidate cache for artist
        revalidateTag(`artist:${artistId}`);

        // Invalidate cache for recommendations for all festivals where this artist is performing
        const festivals = await this.festivalService.getAllFestivals();
        festivals.forEach(festival => {
            if (festival.lineup.some(act => act.artistId === artistId)) {
                revalidateTag(`recommendations:${festival.id}`);
            }
        });
    }

    /**
     * Invalidate cache when an artist is deleted.
     * Must be called before the artist is actually deleted.
     * @param artistId - ID of the deleted artist
     */
    async artistWillBeDeleted(artistId: string): Promise<void> {
        this.logger.info(`Invalidating cache for deleted artist: ${artistId}`);

        // Invalidate cache for artist
        revalidateTag(`artist:${artistId}`);

        // Invalidate cache for recommendations for all festivals where this artist was performing
        const festivals = await this.festivalService.getAllFestivals();
        festivals.forEach(festival => {
            if (festival.lineup.some(act => act.artistId === artistId)) {
                revalidateTag(`recommendations:${festival.id}`);
            }
        });
        revalidateTag('festivals'); // Also invalidate global festivals cache
    }
}
