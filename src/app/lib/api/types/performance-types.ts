export interface Performance {
    id: string;
    artistId: string;
    artist: { name: string; id: string };
    startTime: string; // ISO string
    endTime: string; // ISO string
    stage: string;
    day: number; // Festival day (1, 2, 3, etc.)
}
