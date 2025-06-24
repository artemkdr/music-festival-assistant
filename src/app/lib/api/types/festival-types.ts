import { Performance } from './performance-types';

// Extend as needed for festival API
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
