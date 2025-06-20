'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import type { UserPreferences } from '@/types';
import { availableGenres } from '@/lib/mock-data';

interface FestivalDiscoveryFormProps {
    onSubmit: (festivalUrl: string, userPreferences: UserPreferences) => Promise<void>;
    isLoading: boolean;
}

/**
 * Form component for festival discovery input
 */
export function FestivalDiscoveryForm({ onSubmit, isLoading }: FestivalDiscoveryFormProps): ReactElement {
    const [festivalUrl, setFestivalUrl] = useState('');
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [discoveryMode, setDiscoveryMode] = useState<'conservative' | 'balanced' | 'adventurous'>('balanced');
    const [errors, setErrors] = useState<Record<string, string>>({});

    /**
     * Handle form submission
     */
    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();

        // Reset errors
        setErrors({});

        // Validate form
        const newErrors: Record<string, string> = {};

        if (!festivalUrl.trim()) {
            newErrors.festivalUrl = 'Festival URL is required';
        } else if (!isValidUrl(festivalUrl)) {
            newErrors.festivalUrl = 'Please enter a valid URL';
        }

        if (selectedGenres.length === 0) {
            newErrors.genres = 'Please select at least one genre';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        } // Create user preferences
        const userPreferences: UserPreferences = {
            genres: selectedGenres,
            discoveryMode,
        };

        await onSubmit(festivalUrl, userPreferences);
    };

    /**
     * Validate URL format
     */
    const isValidUrl = (url: string): boolean => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    /**
     * Handle genre selection
     */
    const handleGenreToggle = (genre: string): void => {
        setSelectedGenres(prev => (prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]));
    };

    /**
     * Handle discovery mode change
     */
    const handleDiscoveryModeChange = (mode: 'conservative' | 'balanced' | 'adventurous'): void => {
        setDiscoveryMode(mode);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Festival Discovery</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Festival URL Input */}
                <div>
                    <label htmlFor="festival-url" className="block text-sm font-medium text-gray-700 mb-2">
                        Festival Website URL
                    </label>
                    <input
                        type="url"
                        id="festival-url"
                        value={festivalUrl}
                        onChange={e => setFestivalUrl(e.target.value)}
                        placeholder="https://summersoundfestival.com"
                        className={`input w-full ${errors.festivalUrl ? 'border-red-500' : ''}`}
                        disabled={isLoading}
                    />
                    {errors.festivalUrl && <p className="mt-1 text-sm text-red-600">{errors.festivalUrl}</p>}
                    <p className="mt-1 text-sm text-gray-500">For this demo, any URL will work as we&apos;re using mock data</p>
                </div>

                {/* Genre Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Music Preferences</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {availableGenres.map(genre => (
                            <button
                                key={genre}
                                type="button"
                                onClick={() => handleGenreToggle(genre)}
                                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                                    selectedGenres.includes(genre) ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                                disabled={isLoading}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                    {errors.genres && <p className="mt-2 text-sm text-red-600">{errors.genres}</p>}
                    <p className="mt-2 text-sm text-gray-500">Select genres you enjoy ({selectedGenres.length} selected)</p>
                </div>

                {/* Discovery Mode */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Discovery Mode</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            {
                                value: 'conservative' as const,
                                title: 'Conservative',
                                description: 'Stick to popular, well-known artists',
                            },
                            {
                                value: 'balanced' as const,
                                title: 'Balanced',
                                description: 'Mix of popular and emerging artists',
                            },
                            {
                                value: 'adventurous' as const,
                                title: 'Adventurous',
                                description: 'Discover hidden gems and new artists',
                            },
                        ].map(mode => (
                            <div
                                key={mode.value}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                    discoveryMode === mode.value ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
                                }`}
                                onClick={() => handleDiscoveryModeChange(mode.value)}
                            >
                                <div className="flex items-center mb-2">
                                    <input
                                        type="radio"
                                        name="discovery-mode"
                                        value={mode.value}
                                        checked={discoveryMode === mode.value}
                                        onChange={() => handleDiscoveryModeChange(mode.value)}
                                        className="mr-2"
                                        disabled={isLoading}
                                    />
                                    <h3 className="font-medium text-gray-900">{mode.title}</h3>
                                </div>
                                <p className="text-sm text-gray-600">{mode.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                    <button type="submit" disabled={isLoading} className={`btn-primary w-full md:w-auto ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <span className="animate-spin mr-2">⏳</span>
                                Discovering Artists...
                            </span>
                        ) : (
                            'Discover Artists'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
