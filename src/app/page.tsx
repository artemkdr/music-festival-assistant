'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import { FestivalDiscoveryForm } from '@/components/festival-discovery-form';
import { RecommendationsList } from '@/components/recommendations-list';
import { LoadingSpinner } from '@/components/loading-spinner';
import type { FestivalDiscoveryResponse, UserPreferences } from '@/types';

/**
 * Main page component for the Music Festival Assistant
 */
export default function HomePage(): ReactElement {
    const [isLoading, setIsLoading] = useState(false);
    const [discoveryResponse, setDiscoveryResponse] = useState<FestivalDiscoveryResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sessionId] = useState(() => crypto.randomUUID());

    /**
     * Handle festival discovery request
     */
    const handleDiscovery = async (festivalUrl: string, userPreferences: UserPreferences): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/festivals/discover', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    festivalUrl,
                    festivalId: 'festival-1', // Using mock festival for now
                    userPreferences,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to discover artists');
            }

            if (data.status === 'success') {
                setDiscoveryResponse(data.data);
            } else {
                throw new Error(data.message || 'Discovery failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handle user feedback on recommendations
     */
    const handleFeedback = async (recommendationId: string, artistId: string, rating: 'like' | 'dislike' | 'love' | 'skip'): Promise<void> => {
        try {
            await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recommendationId,
                    artistId,
                    rating,
                    sessionId,
                }),
            });
        } catch (err) {
            console.error('Failed to submit feedback:', err);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero Section */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Discover Your Next Favorite Artist</h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Enter a festival URL and your music preferences to get personalized artist recommendations. Never miss out on discovering amazing music again.
                </p>
            </div>

            {/* Discovery Form */}
            <div className="mb-8">
                <FestivalDiscoveryForm onSubmit={handleDiscovery} isLoading={isLoading} />
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <span className="text-red-400">⚠️</span>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <p className="mt-1 text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center py-12">
                    <LoadingSpinner />
                </div>
            )}

            {/* Results */}
            {discoveryResponse && !isLoading && (
                <div className="animate-fade-in">
                    <RecommendationsList festival={discoveryResponse.festival} recommendations={discoveryResponse.recommendations} onFeedback={handleFeedback} />
                </div>
            )}

            {/* Empty State */}
            {!discoveryResponse && !isLoading && !error && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎵</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Discover Amazing Music?</h3>
                    <p className="text-gray-600">Enter a festival URL above to get started with personalized recommendations.</p>
                </div>
            )}
        </div>
    );
}
