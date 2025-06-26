// Extend as needed for artist API
export interface Artist {
    id: string;
    name: string;
    genre?: string[];
    description?: string;
    imageUrl?: string;
}

export interface ArtistDetails {
    id: string;
    name: string;
    genre: string[];
    mappingIds?: Record<string, string>;
    imageUrl?: string;
    description?: string;
    popularity?: Record<string, number>;
    streamingLinks?: {
        spotify?: string;
        appleMusic?: string;
        youtube?: string;
        soundcloud?: string;
        bandcamp?: string;
    };
    socialLinks?: {
        website?: string;
        instagram?: string;
        twitter?: string;
        facebook?: string;
    };
    followers?: number;
}

export interface ArtistPerformance {
    festivalId: string;
    festivalName: string;
    artistName: string;
    date?: string;
    time?: string;
    stage?: string;
}
