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
     * Compute a match score between the search query and the artist's name.
     * Higher score means better match. Exact match gets highest score.
     * @param queryName - The search query
     * @param artistName - The artist's name from Spotify
     * @returns number - match score
     */
    private getArtistMatchScore(queryName: string, artistName: string): number {
        const queryWords = queryName.toLowerCase().split(/\s+/);
        const nameWords = artistName.toLowerCase().split(/\s+/);
        // Exact match gets highest score
        if (artistName.toLowerCase() === queryName.toLowerCase()) return 10000;
        // Count how many words from query are present in artist name
        let matchCount = 0;
        for (const word of queryWords) {
            if (nameWords.includes(word)) matchCount++;
        }
        // Partial match: more words matched = higher score
        return matchCount * 10 - Math.abs(nameWords.length - queryWords.length);
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
        // Sort by match score, then by exact match, then by popularity
        data.artists.items.sort((a: SpotifyArtistResponse, b: SpotifyArtistResponse) => {
            const scoreA = this.getArtistMatchScore(name, a.name);
            const scoreB = this.getArtistMatchScore(name, b.name);
            if (scoreA !== scoreB) return scoreB - scoreA; // higher score first
            // If scores are equal, prefer exact match
            if (a.name.toLowerCase() === name.toLowerCase()) return -1;
            if (b.name.toLowerCase() === name.toLowerCase()) return 1;
            // Otherwise, sort by popularity
            return b.popularity - a.popularity;
        });
        // return the first artist that matches
        const artist = data.artists?.items?.[0];
        if (!artist) return null;
        return this.mapSpotifyArtist(artist);
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
