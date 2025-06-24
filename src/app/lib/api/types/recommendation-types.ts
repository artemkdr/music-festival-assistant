import { ArtistDetails } from '@/app/lib/api/types/artist-types';
import { Performance } from '@/app/lib/api/types/performance-types';

/**
 * artist: ArtistSchema,
     performance: PerformanceSchema,
     score: z.number().min(0).max(1), // Confidence score
     reasons: z.array(z.string()), // Why this artist is recommended
     similarArtists: z.array(ArtistSchema).optional(), // Optional similar artists
     aiEnhanced: z.boolean().default(false), // Whether this recommendation was enhanced by AI
     aiTags: z.array(z.string()).optional(), // AI-generated tags for this recommendation
 */
export interface Recommendation {
    artist: ArtistDetails;
    performance: Performance;
    score: number; // Confidence score between 0 and 1
    reasons: string[]; // Reasons why this artist is recommended
    similarArtists?: ArtistDetails[]; // Optional list of similar artists' IDs
    aiEnhanced?: boolean; // Whether this recommendation was enhanced by AI
    aiTags?: string[]; // Optional AI-generated tags for this recommendation
}
