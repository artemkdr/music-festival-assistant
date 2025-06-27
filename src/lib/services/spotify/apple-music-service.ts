/**
 * Apple Music API service for artist data lookup
 * Uses Apple Music API to search and fetch artist data by name or ID.
 *
 * NOTE: You must provide a valid Apple Music developer token (JWT). 
 * For production, implement proper JWT token generation with your private key.
 */
import type { ILogger } from '@/lib/types/logger';

export interface AppleMusicArtist {
    id: string;
    name: string;
    genres: string[];
    popularity: number;
    followers: number;
    appleMusicUrl: string;
    imageUrl?: string | undefined;
}

interface AppleMusicArtistResponse {
    id: string;
    type: 'artists';
    attributes: {
        name: string;
        genreNames?: string[];
        url?: string;
        artwork?: {
            url: string;
            width: number;
            height: number;
        };
    };
    relationships?: {
        albums?: {
            data: Array<{
                id: string;
                type: 'albums';
            }>;
        };
    };
}

interface AppleMusicSearchResponse {
    results: {
        artists?: {
            data: AppleMusicArtistResponse[];
        };
    };
}

interface AppleMusicArtistDetailResponse {
    data: AppleMusicArtistResponse[];
}

export class AppleMusicService {
    private readonly baseUrl = 'https://api.music.apple.com/v1';
    private readonly storefront: string;

    constructor(
        private readonly logger: ILogger,
        private readonly developerToken: string,
        storefront: string = 'us' // Default to US storefront
    ) {
        this.storefront = storefront;
    }

    /**
     * Get authorization headers for Apple Music API
     */
    private getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.developerToken}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Compute a normalized match score between the search query and the artist's name.
     * 1 = exact match, 0 = no match, partial = ratio of matching words.
     * @param queryName - The search query
     * @param artistName - The artist's name from Apple Music
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
     * Search for an artist by name using Apple Music API
     */
    async searchArtistByName(name: string): Promise<AppleMusicArtist | null> {
        const url = `${this.baseUrl}/catalog/${this.storefront}/search?term=${encodeURIComponent(name)}&types=artists&limit=10`;
        
        const response = await fetch(url, {
            headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Apple Music API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data: AppleMusicSearchResponse = await response.json();
        const normalizedName = this.normalize(name);
        
        const artists = data.results.artists?.data || [];
        
        // Sort by match score, then by exact match
        artists.sort((a: AppleMusicArtistResponse, b: AppleMusicArtistResponse) => {
            const scoreA = this.getArtistMatchScore(normalizedName, this.normalize(a.attributes.name));
            const scoreB = this.getArtistMatchScore(normalizedName, this.normalize(b.attributes.name));
            if (scoreA !== scoreB) return scoreB - scoreA; // higher score first
            
            // If scores are equal, prefer exact match
            if (this.normalize(a.attributes.name) === normalizedName) return -1;
            if (this.normalize(b.attributes.name) === normalizedName) return 1;
            
            return 0; // Apple Music doesn't provide popularity scores directly
        });

        // Return the first artist that matches
        const artist = artists[0];
        if (!artist) return null;

        // If found artist has a matching score less than 50%, return null
        const matchScore = this.getArtistMatchScore(normalizedName, this.normalize(artist.attributes.name));
        if (matchScore <= 0.5) {
            this.logger.warn('No good match found for artist', {
                searchedName: normalizedName,
                foundName: this.normalize(artist.attributes.name),
                matchScore,
            });
            return null;
        }

        return this.mapAppleMusicArtist(artist);
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
     * Get artist by Apple Music ID
     */
    async getArtistById(id: string): Promise<AppleMusicArtist | null> {
        const url = `${this.baseUrl}/catalog/${this.storefront}/artists/${id}`;
        
        const response = await fetch(url, {
            headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Apple Music API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data: AppleMusicArtistDetailResponse = await response.json();
        const artist = data.data[0];
        
        if (!artist) return null;
        
        return this.mapAppleMusicArtist(artist);
    }

    /**
     * Map Apple Music API artist object to internal type
     */
    private mapAppleMusicArtist(artist: AppleMusicArtistResponse): AppleMusicArtist {
        // Generate artwork URL if available (Apple Music uses template URLs)
        let imageUrl: string | undefined;
        if (artist.attributes.artwork?.url) {
            // Replace template placeholders with actual dimensions
            imageUrl = artist.attributes.artwork.url
                .replace('{w}', '400')
                .replace('{h}', '400');
        }

        return {
            id: artist.id,
            name: artist.attributes.name,
            genres: artist.attributes.genreNames || [],
            popularity: 0, // Apple Music doesn't provide popularity scores directly
            followers: 0, // Apple Music doesn't provide follower counts
            imageUrl,
            appleMusicUrl: artist.attributes.url || '',
        };
    }
}
