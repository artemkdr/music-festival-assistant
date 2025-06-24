// Extend as needed for festival API
export interface Performance {
    id: string;
    artistId: string;
    artist: { name: string; id: string };
    startTime: string; // ISO string
    endTime: string; // ISO string
    stage: string;
    day: number; // Festival day (1, 2, 3, etc.)
}

export interface Festival {
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
    website?: string | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
    performances: Performance[];
}
