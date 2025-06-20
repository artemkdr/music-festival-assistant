/**
 * Mock repository implementations using in-memory data
 * These will be replaced with actual database implementations in production
 */
import type { Artist, Festival, Performance, UserFeedback } from '@/types';
import type { IFestivalRepository, IArtistRepository, IPerformanceRepository, IUserFeedbackRepository } from './interfaces';
import { mockFestival, mockArtists, mockPerformances } from '@/lib/mock-data';
import type { ILogger } from '@/lib/logger';

/**
 * Mock festival repository implementation
 */
export class MockFestivalRepository implements IFestivalRepository {
    private festivals: Festival[] = [mockFestival];

    constructor(private logger: ILogger) {}

    async getFestivalById(id: string): Promise<Festival | null> {
        this.logger.debug('Getting festival by ID', { id });
        const festival = this.festivals.find(f => f.id === id) ?? null;
        this.logger.info('Festival lookup result', { id, found: !!festival });
        return festival;
    }

    async getFestivalByUrl(url: string): Promise<Festival | null> {
        this.logger.debug('Getting festival by URL', { url });
        // In real implementation, this would parse the URL and scrape the website
        const festival = this.festivals.find(f => f.website === url) ?? null;
        this.logger.info('Festival URL lookup result', { url, found: !!festival });
        return festival;
    }

    async getAllFestivals(): Promise<Festival[]> {
        this.logger.debug('Getting all festivals');
        this.logger.info('Retrieved all festivals', { count: this.festivals.length });
        return [...this.festivals];
    }

    async saveFestival(festival: Festival): Promise<Festival> {
        this.logger.debug('Saving festival', { festivalId: festival.id });
        const existingIndex = this.festivals.findIndex(f => f.id === festival.id);

        if (existingIndex >= 0) {
            this.festivals[existingIndex] = festival;
            this.logger.info('Updated existing festival', { festivalId: festival.id });
        } else {
            this.festivals.push(festival);
            this.logger.info('Created new festival', { festivalId: festival.id });
        }

        return festival;
    }
}

/**
 * Mock artist repository implementation
 */
export class MockArtistRepository implements IArtistRepository {
    private artists: Artist[] = mockArtists;

    constructor(private logger: ILogger) {}

    async getArtistById(id: string): Promise<Artist | null> {
        this.logger.debug('Getting artist by ID', { id });
        const artist = this.artists.find(a => a.id === id) ?? null;
        this.logger.info('Artist lookup result', { id, found: !!artist });
        return artist;
    }

    async getArtistsByGenres(genres: string[]): Promise<Artist[]> {
        this.logger.debug('Getting artists by genres', { genres });
        const matchingArtists = this.artists.filter(artist =>
            artist.genre.some(artistGenre => genres.some(userGenre => artistGenre.toLowerCase().includes(userGenre.toLowerCase()) || userGenre.toLowerCase().includes(artistGenre.toLowerCase())))
        );
        this.logger.info('Genre-based artist lookup result', {
            genres,
            foundCount: matchingArtists.length,
        });
        return matchingArtists;
    }

    async searchArtistsByName(name: string): Promise<Artist[]> {
        this.logger.debug('Searching artists by name', { name });
        const searchTerm = name.toLowerCase();
        const matchingArtists = this.artists.filter(artist => artist.name.toLowerCase().includes(searchTerm));
        this.logger.info('Name-based artist search result', {
            name,
            foundCount: matchingArtists.length,
        });
        return matchingArtists;
    }

    async getAllArtists(): Promise<Artist[]> {
        this.logger.debug('Getting all artists');
        this.logger.info('Retrieved all artists', { count: this.artists.length });
        return [...this.artists];
    }
}

/**
 * Mock performance repository implementation
 */
export class MockPerformanceRepository implements IPerformanceRepository {
    private performances: Performance[] = mockPerformances;

    constructor(private logger: ILogger) {}

    async getPerformancesByFestivalId(festivalId: string): Promise<Performance[]> {
        this.logger.debug('Getting performances by festival ID', { festivalId });
        // In this mock, all performances belong to the same festival
        const performances = festivalId === 'festival-1' ? [...this.performances] : [];
        this.logger.info('Festival performances lookup result', {
            festivalId,
            foundCount: performances.length,
        });
        return performances;
    }

    async getPerformancesByArtistId(artistId: string): Promise<Performance[]> {
        this.logger.debug('Getting performances by artist ID', { artistId });
        const performances = this.performances.filter(p => p.artistId === artistId);
        this.logger.info('Artist performances lookup result', {
            artistId,
            foundCount: performances.length,
        });
        return performances;
    }

    async getPerformancesByDay(festivalId: string, day: number): Promise<Performance[]> {
        this.logger.debug('Getting performances by day', { festivalId, day });
        const performances = this.performances.filter(p => p.day === day);
        this.logger.info('Day-based performances lookup result', {
            festivalId,
            day,
            foundCount: performances.length,
        });
        return performances;
    }
}

/**
 * Mock user feedback repository implementation
 */
export class MockUserFeedbackRepository implements IUserFeedbackRepository {
    private feedback: UserFeedback[] = [];

    constructor(private logger: ILogger) {}

    async saveFeedback(feedback: UserFeedback): Promise<UserFeedback> {
        this.logger.debug('Saving user feedback', {
            artistId: feedback.artistId,
            rating: feedback.rating,
        });
        this.feedback.push(feedback);
        this.logger.info('User feedback saved', {
            artistId: feedback.artistId,
            rating: feedback.rating,
            sessionId: feedback.sessionId,
        });
        return feedback;
    }

    async getFeedbackBySessionId(sessionId: string): Promise<UserFeedback[]> {
        this.logger.debug('Getting feedback by session ID', { sessionId });
        const sessionFeedback = this.feedback.filter(f => f.sessionId === sessionId);
        this.logger.info('Session feedback lookup result', {
            sessionId,
            foundCount: sessionFeedback.length,
        });
        return sessionFeedback;
    }

    async getArtistFeedbackStats(artistId: string): Promise<{
        likes: number;
        dislikes: number;
        loves: number;
        skips: number;
    }> {
        this.logger.debug('Getting artist feedback stats', { artistId });
        const artistFeedback = this.feedback.filter(f => f.artistId === artistId);

        const stats = {
            likes: artistFeedback.filter(f => f.rating === 'like').length,
            dislikes: artistFeedback.filter(f => f.rating === 'dislike').length,
            loves: artistFeedback.filter(f => f.rating === 'love').length,
            skips: artistFeedback.filter(f => f.rating === 'skip').length,
        };

        this.logger.info('Artist feedback stats calculated', { artistId, stats });
        return stats;
    }
}
