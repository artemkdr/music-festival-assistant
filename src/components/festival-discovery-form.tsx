'use client';

import { discoverApi, FestivalInfo } from '@/app/lib/api/discover-api';
import { GenresGrid } from '@/components/genres-grid';
import { UserPreferences } from '@/lib/schemas';
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
    const [festivals, setFestivals] = useState<FestivalInfo[]>([]);
    const [selectedFestivalId, setSelectedFestivalId] = useState('');
    const [festivalSearchTerm, setFestivalSearchTerm] = useState('');
    const [showFestivalDropdown, setShowFestivalDropdown] = useState(false);
    const [loadingFestivals, setLoadingFestivals] = useState(false);
    const [availableGenres, setAvailableGenres] = useState<
        {
            name: string;
            count: number;
        }[]
    >([]); // now dynamic
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [loadingGenres, setLoadingGenres] = useState(false);
    const [discoveryMode, setDiscoveryMode] = useState<'conservative' | 'balanced' | 'adventurous'>('balanced');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [userNotes, setUserNotes] = useState('');
    const [recommendationsCount, setRecommendationsCount] = useState(5); // Default to 5 recommendations

    // Load festivals on component mount
    useEffect(() => {
        const loadFestivals = async () => {
            setLoadingFestivals(true);
            try {
                const response = await discoverApi.getFestivals();
                if (response.status === 'success' && response.data) {
                    const sortedData = response.data.sort((a, b) => {
                        // Sort by start date, then by name
                        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime() || a.name.localeCompare(b.name);
                    });
                    setFestivals(sortedData);
                }
            } catch (error) {
                // TODO: use logger
                console.error('Failed to load festivals:', error);
            } finally {
                setLoadingFestivals(false);
            }
        };
        loadFestivals();
    }, []);

    // Load genres when a festival is selected
    useEffect(() => {
        if (!selectedFestivalId) {
            setAvailableGenres([]);
            setSelectedGenres([]);
            return;
        }
        setLoadingGenres(true);
        discoverApi
            .getFestivalGenres(selectedFestivalId)
            .then(response => {
                if (response.status === 'success' && response.data) {
                    setAvailableGenres(
                        response.data as {
                            name: string;
                            count: number;
                        }[]
                    );
                } else {
                    setAvailableGenres([]);
                }
            })
            .catch(() => {
                setAvailableGenres([]);
            })
            .finally(() => setLoadingGenres(false));
    }, [selectedFestivalId]);

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

        if (selectedGenres.length === 0 && !userNotes.trim()) {
            newErrors.genres = 'Please select at least one genre or provide additional preferences';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Create user preferences
        const userPreferences: UserPreferences = {
            genres: selectedGenres,
            recommendationStyle: discoveryMode,
            comment: userNotes.trim().substring(0, 500) ?? undefined,
            recommendationsCount,
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
        setSelectedGenres([]); // reset genres on festival change
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
                    <label htmlFor="festival-search" className="block font-bold text-base mb-3">
                        Select Festival
                    </label>
                    <div className="relative">
                        <input
                            type="search"
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
                            placeholder="Select a festival..."
                            className={`input w-full ${errors.festival ? 'border-red-500' : ''}`}
                            disabled={isLoading || loadingFestivals}
                            autoComplete="off"
                        />

                        <p className="mt-1 text-sm text-gray-500">Select from {festivals.length} festivals</p>

                        {/* Loading indicator */}
                        {loadingFestivals && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                        )}

                        {/* Dropdown */}
                        {showFestivalDropdown && !loadingFestivals && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                {festivals?.map(festival => (
                                    <button
                                        key={festival.id}
                                        type="button"
                                        onClick={() => handleFestivalSelect(festival.id)}
                                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0`}
                                    >
                                        <div className="font-medium text-gray-900">{festival.name}</div>
                                        <div className="text-sm text-gray-500">{festival.location}</div>
                                        <div className="text-xs text-gray-400">
                                            {festival.startDate} - {festival.endDate}
                                        </div>
                                        <div className="text-xs text-gray-400">{festival.artistsCount}+ artists</div>
                                    </button>
                                ))}
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
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Genre Selection */}
                <div>
                    <label className="block font-bold text-base mb-3">Music Preferences</label>
                    {loadingGenres ? (
                        <div className="text-gray-500 text-sm">Loading genres...</div>
                    ) : (
                        <GenresGrid genres={availableGenres} selectedGenres={selectedGenres} onGenreToggle={handleGenreToggle} isLoading={isLoading} />
                    )}
                    {errors.genres && <p className="mt-2 text-sm text-red-600">{errors.genres}</p>}
                </div>

                {/* Additional Preferences (Free Text) */}
                <div>
                    <label htmlFor="user-notes" className="block font-bold text-base mb-3">
                        Additional Preferences
                    </label>
                    <textarea
                        id="user-notes"
                        value={userNotes}
                        maxLength={500}
                        onChange={e => setUserNotes(e.target.value)}
                        placeholder="Tell us anything else about your music taste, artists, or festival experience..."
                        className="input w-full min-h-[80px] resize-y border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        disabled={isLoading}
                    />
                    <p className="mt-1 text-sm text-gray-500">Add any extra info to help us personalize your recommendations</p>
                </div>

                {/* Discovery Mode */}
                <div>
                    <label className="block font-bold text-base mb-3">Discovery Mode</label>
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

                {/* Recommendations count */}
                <div>
                    <label className="block font-bold text-base mb-3">How many concerts do you want to visit?</label>
                    <div className="flex items-center space-x-4">
                        <input
                            type="range"
                            min={1}
                            max={10}
                            value={recommendationsCount}
                            className="input w-30 max-w-99/100 text-center"
                            disabled={isLoading}
                            onChange={e => setRecommendationsCount(Number(e.target.value))}
                        />
                        <span className="text-sm text-gray-500">We will try recommend you {recommendationsCount} concerts</span>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center">
                    <button type="submit" disabled={isLoading} className="btn-primary w-full md:w-auto px-6 py-4">
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
