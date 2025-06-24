export interface UserPreferences {
    genres: string[]; // List of preferred genres (at least one, max 20)
    comment?: string; // Optional comment from the user
    preferredArtists?: string[]; // Optional list of preferred artists' IDs
    dislikedArtists?: string[]; // Optional list of disliked artists' IDs
    timePreferences?: {
        preferredDays?: number[]; // Optional list of preferred days (1-10)
        preferredTimeSlots?: ('morning' | 'afternoon' | 'evening' | 'night')[]; // Optional list of preferred time slots
    };
    discoveryMode: 'conservative' | 'balanced' | 'adventurous'; // Discovery mode preference
}
