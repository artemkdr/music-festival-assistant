'use client';

import { Festival, festivalsApi } from '@/app/lib/api';
import { availableGenres } from '@/lib/mock-data';
import type { UserPreferences } from '@/schemas';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

interface FestivalDiscoveryFormProps {
    onSubmit: (festivalId: string, userPreferences: UserPreferences) => Promise<void>;
    isLoading: boolean;
}

/**
 * Form component for festival discovery input
 */
export function FestivalDiscoveryForm({ onSubmit, isLoading }: FestivalDiscoveryFormProps): ReactElement {
    const [festivals, setFestivals] = useState<Festival[]>([]);
    const [selectedFestivalId, setSelectedFestivalId] = useState('');
    const [festivalSearchTerm, setFestivalSearchTerm] = useState('');
    const [showFestivalDropdown, setShowFestivalDropdown] = useState(false);
    const [loadingFestivals, setLoadingFestivals] = useState(false);
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [discoveryMode, setDiscoveryMode] = useState<'conservative' | 'balanced' | 'adventurous'>('balanced');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load festivals on component mount
    useEffect(() => {
        const loadFestivals = async () => {
            setLoadingFestivals(true);
            try {
                const response = await festivalsApi.getFestivals();
                if (response.status === 'success' && response.data) {
                    setFestivals(response.data as Festival[]);
                }
            } catch (error) {
                console.error('Failed to load festivals:', error);
            } finally {
                setLoadingFestivals(false);
            }
        };

        loadFestivals();
    }, []);

    // Filter festivals based on search term
    const filteredFestivals = festivals.filter(
        festival => festival.name.toLowerCase().includes(festivalSearchTerm.toLowerCase()) || festival.location.toLowerCase().includes(festivalSearchTerm.toLowerCase())
    );

    // Get selected festival details
    const selectedFestival = festivals.find(f => f.id === selectedFestivalId);

    /**
     * Handle form submission
     */
    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();

        // Reset errors
        setErrors({});

        // Validate form
        const newErrors: Record<string, string> = {};

        if (!selectedFestivalId) {
            newErrors.festival = 'Please select a festival';
        }

        if (selectedGenres.length === 0) {
            newErrors.genres = 'Please select at least one genre';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Create user preferences
        const userPreferences: UserPreferences = {
            genres: selectedGenres,
            discoveryMode,
        };

        await onSubmit(selectedFestivalId, userPreferences);
    };

    /**
     * Handle festival selection
     */
    const handleFestivalSelect = (festivalId: string): void => {
        setSelectedFestivalId(festivalId);
        const festival = festivals.find(f => f.id === festivalId);
        setFestivalSearchTerm(festival ? festival.name : '');
        setShowFestivalDropdown(false);
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
                {/* Festival Selection */}
                <div>
                    <label htmlFor="festival-search" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Festival
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            id="festival-search"
                            value={festivalSearchTerm}
                            onChange={e => {
                                setFestivalSearchTerm(e.target.value);
                                setShowFestivalDropdown(true);
                                if (!e.target.value) {
                                    setSelectedFestivalId('');
                                }
                            }}
                            onFocus={() => setShowFestivalDropdown(true)}
                            placeholder="Search for a festival..."
                            className={`input w-full ${errors.festival ? 'border-red-500' : ''}`}
                            disabled={isLoading || loadingFestivals}
                        />

                        {/* Loading indicator */}
                        {loadingFestivals && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                        )}

                        {/* Dropdown */}
                        {showFestivalDropdown && !loadingFestivals && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                {filteredFestivals.length > 0 ? (
                                    filteredFestivals.map(festival => (
                                        <button
                                            key={festival.id}
                                            type="button"
                                            onClick={() => handleFestivalSelect(festival.id)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="font-medium text-gray-900">{festival.name}</div>
                                            <div className="text-sm text-gray-500">{festival.location}</div>
                                            <div className="text-xs text-gray-400">
                                                {new Date(festival.startDate).toLocaleDateString()} - {new Date(festival.endDate).toLocaleDateString()}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-gray-500 text-sm">{festivalSearchTerm ? 'No festivals found matching your search' : 'No festivals available'}</div>
                                )}
                            </div>
                        )}

                        {/* Click outside to close dropdown */}
                        {showFestivalDropdown && <div className="fixed inset-0 z-5" onClick={() => setShowFestivalDropdown(false)} />}
                    </div>

                    {errors.festival && <p className="mt-1 text-sm text-red-600">{errors.festival}</p>}

                    {/* Selected Festival Display */}
                    {selectedFestival && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-start">
                                <span className="text-blue-400 mr-2">🎪</span>
                                <div>
                                    <div className="font-medium text-blue-900">{selectedFestival.name}</div>
                                    <div className="text-sm text-blue-700">{selectedFestival.location}</div>
                                    <div className="text-xs text-blue-600">{selectedFestival.performances.length} artists performing</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="mt-1 text-sm text-gray-500">Search and select from {festivals.length} festivals in our database</p>
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
