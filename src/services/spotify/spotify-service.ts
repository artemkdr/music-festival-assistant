/**
 * Spotify API service for artist data lookup
 * Uses Spotify Web API to search and fetch artist data by name or ID.
 *
 * NOTE: You must provide a valid Spotify access token. For production, implement token refresh logic.
 */
import type { ILogger } from '@/lib/logger';

export interface SpotifyArtist {
    id: string;
    name: string;
    genres: string[];
    popularity: number;
    followers: number;
    spotifyUrl: string;
    imageUrl?: string | undefined;
}

interface SpotifyArtistResponse {
    id: string;
    name: string;
    genres: string[];
    popularity: number;
    followers: {
        total: number;
    };
    images?: { url: string }[];
    external_urls?: {
        spotify: string;
    };
    description?: string; // Not provided by Spotify, but can be added later
}

export class SpotifyService {
    private readonly baseUrl = 'https://api.spotify.com/v1';
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(
        private readonly logger: ILogger,
        private readonly clientId: string,
        private readonly clientSecret: string
    ) {}

    /**
     * Refresh access token from Spotify API and update expiration
     */
    private async refreshAccessToken(): Promise<string> {
        const url = 'https://accounts.spotify.com/api/token';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Spotify API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const data = await response.json();
        if (!data.access_token) {
            throw new Error('Spotify API did not return access token');
        }
        this.accessToken = data.access_token;
        // expires_in is in seconds
        this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60000; // refresh 1 min before expiry
        this.logger.info('Spotify access token refreshed', { expiresIn: data.expires_in });
        if (this.accessToken) {
            return this.accessToken;
        }
        throw new Error('Failed to obtain Spotify access token');
    }

    /**
     * Get a valid access token, refreshing if needed
     */
    private async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }
        return this.refreshAccessToken();
    }

    /**
     * Compute a normalized match score between the search query and the artist's name.
     * 1 = exact match, 0 = no match, partial = ratio of matching words.
     * @param queryName - The search query
     * @param artistName - The artist's name from Spotify
     * @returns number - match score between 0 and 1
     */
    private getArtistMatchScore(queryName: string, artistName: string): number {
        const query = queryName.trim().toLowerCase();
        const name = artistName.trim().toLowerCase();
        if (!query || !name) return 0;
        if (name === query) return 1;
        const queryWords = query.split(/\s+/);
        const nameWords = name.split(/\s+/);
        const totalWords = Math.max(queryWords.length, nameWords.length);
        if (totalWords === 0) return 0;
        let matchCount = 0;
        for (const word of queryWords) {
            if (nameWords.includes(word)) matchCount++;
        }
        return matchCount > 0 ? matchCount / totalWords : 0;
    }

    /**
     * Search for an artist by name using Spotify API
     */
    async searchArtistByName(name: string): Promise<SpotifyArtist | null> {
        const url = `${this.baseUrl}/search?q=${encodeURIComponent(name)}&type=artist&limit=10`;
        const token = await this.getAccessToken();
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Spotify API error: ${res.status} ${res.statusText} - ${errorText}`);
        }
        const data = await res.json();
        const normalizedName = this.normalize(name);
        // Sort by match score, then by exact match, then by popularity
        data.artists.items.sort((a: SpotifyArtistResponse, b: SpotifyArtistResponse) => {
            const scoreA = this.getArtistMatchScore(normalizedName, this.normalize(a.name));
            const scoreB = this.getArtistMatchScore(normalizedName, this.normalize(b.name));
            if (scoreA !== scoreB) return scoreB - scoreA; // higher score first
            // If scores are equal, prefer exact match
            if (this.normalize(a.name) === normalizedName) return -1;
            if (this.normalize(b.name) === normalizedName) return 1;
            // Otherwise, sort by popularity
            return b.popularity - a.popularity;
        });
        // return the first artist that matches
        const artist = data.artists?.items?.[0];
        if (!artist) return null;
        // if found artist has a matching score less than 50%, return null
        const matchScore = this.getArtistMatchScore(normalizedName, this.normalize(artist.name));
        if (matchScore <= 0.5) {
            this.logger.warn('No good match found for artist', {
                searchedName: normalizedName,
                foundName: this.normalize(artist.name),
                matchScore,
            });
            return null;
        }
        return this.mapSpotifyArtist(artist);
    }

    private normalize(name: string): string {
        return name
            .normalize('NFD') // Normalize to decompose diacritics
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
            .toLowerCase()
            .trim();
    }

    /**
     * Get artist by Spotify ID
     */
    async getArtistById(id: string): Promise<SpotifyArtist | null> {
        const url = `${this.baseUrl}/artists/${id}`;
        const token = await this.getAccessToken();
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Spotify API error: ${res.status} ${res.statusText} - ${errorText}`);
        }
        const artist = await res.json();
        return this.mapSpotifyArtist(artist);
    }

    /**
     * Map Spotify API artist object to internal type
     */
    private mapSpotifyArtist(artist: SpotifyArtistResponse): SpotifyArtist {
        return {
            id: artist.id,
            name: artist.name,
            genres: artist.genres || [],
            popularity: artist.popularity || 0,
            followers: artist.followers?.total || 0,
            imageUrl: artist.images?.[0]?.url,
            spotifyUrl: artist.external_urls?.spotify || '',
        };
    }
}
