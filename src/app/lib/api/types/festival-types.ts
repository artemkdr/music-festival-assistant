// Extend as needed for festival API
export interface Festival {
    id: string;
    name: string;
    location: string;
    website?: string | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
    lineup: [
        {
            date: string;
            list: {
                artistName: string;
                artistId?: string | undefined;
                time?: string | undefined;
                stage?: string | undefined;
            }[];
        },
    ];
}
