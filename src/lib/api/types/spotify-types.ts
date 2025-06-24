export interface SpotifySearchResult {
    id: string;
    name: string;
    genres?: string[];
    images?: { url: string }[];
    popularity?: number;
}
