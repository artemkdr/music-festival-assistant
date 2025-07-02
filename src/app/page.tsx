'use client';

import { discoverApi, FestivalDiscoveryResponse } from '@/app/lib/api/discover-api';
import { FestivalDiscoveryForm } from '@/components/festival-discovery-form';
import { RecommendationsLoadingSpinner } from '@/components/recommendations-loading-spinner';
import { Logo } from '@/components/logo';
import { RecommendationsList } from '@/components/recommendations-list';
import { UserPreferences } from '@/lib/schemas';
import type { ReactElement } from 'react';
import { useState } from 'react';

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
    const handleDiscovery = async (festivalId: string, userPreferences: UserPreferences): Promise<void> => {
        setIsLoading(true);
        setError(null);

        // scroll to bottom of the page
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

        try {
            const response = await discoverApi.getRecommendations(festivalId, userPreferences);
            if (response.status === 'success' && response.data) {
                setDiscoveryResponse(response.data);
            } else {
                throw new Error(response.message || 'Discovery failed');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            {/* Hero Section */}
            <div className="text-center p-2 md:p-4 flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-gray-900">Discover Your Next Favorite Artist</h1>
                <p className="text-base text-gray-600 max-w-3xl mx-auto">
                    Choose from our collection of festivals and get personalized artist recommendations based on your music preferences. Never miss out on discovering amazing music again.
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
                    <RecommendationsLoadingSpinner />
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
                    <div className="text-6xl mb-4">
                        <Logo className="w-16 h-16 mx-auto" size={40} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Discover Amazing Music?</h3>
                    <p className="text-gray-600">Select a festival above to get started with personalized recommendations.</p>
                    <p className="text-gray-500 text-sm mt-4">
                        The recommendations are generated by AI based on your preferences and the festival lineup.
                        <br />
                        The recommendations may not be fully accurate.
                        <br />
                        But they are a great way to discover new artists you might love!
                    </p>
                </div>
            )}
        </div>
    );
}
