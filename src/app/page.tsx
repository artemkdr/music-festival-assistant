'use client';

import { ApiResponse } from '@/app/lib/api';
import { discoverApi, FestivalDiscoveryResponse } from '@/app/lib/api/discover-api';
import { FestivalDiscoveryForm } from '@/components/festival-discovery-form';
import { Logo } from '@/components/logo';
import { RecommendationsList } from '@/components/recommendations-list';
import { RecommendationsLoadingSpinner } from '@/components/recommendations-loading-spinner';
import { UserPreferences } from '@/lib/schemas';
import { toError } from '@/lib/utils/error-handler';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import { useState } from 'react';

/**
 * Main page component for the Music Festival Assistant
 */
export default function HomePage(): ReactElement {
    const t = useTranslations();
    const [isLoading, setIsLoading] = useState(false);
    const [discoveryResponse, setDiscoveryResponse] = useState<FestivalDiscoveryResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * handler API error response
     */
    const handleApiError = (apiResponse: ApiResponse) => {
        if (apiResponse.status !== 'success') {
            switch (apiResponse.error?.status) {
                case 400:
                    setError(t('HomePage.ErrorBadRequest'));
                    break;
                case 401:
                    setError(t('HomePage.ErrorUnauthorized'));
                    break;
                case 404:
                    setError(t('HomePage.ErrorNotFound'));
                    break;
                case 429:
                    setError(t('HomePage.ErrorTooManyRequests'));
                    break;
                case 500:
                    setError(t('HomePage.ErrorServer'));
                    break;
                default:
                    setError(t('HomePage.ErrorOccurred'));
            }
        } else {
            setError(null);
        }
    };

    /**
     * Handle festival discovery request
     */
    const handleSubmit = async (festivalId: string, userPreferences: UserPreferences): Promise<void> => {
        setIsLoading(true);
        setError(null);

        // scroll to bottom of the page
        if (typeof window !== 'undefined' && 'scrollBy' in window) {
            setTimeout(() => {
                window.scrollBy({ top: 200, behavior: 'smooth' });
            }, 100);
        }

        try {
            const response = await discoverApi.getRecommendations(festivalId, userPreferences);
            if (response.status === 'success' && response.data) {
                setDiscoveryResponse(response.data);
            } else {
                // Handle error response
                handleApiError(response);
            }
        } catch (err: unknown) {
            handleApiError({
                status: 'error',
                message: toError(err).message,
                error: {
                    status: 500,
                    statusText: 'Internal Server Error',
                    details: toError(err).message,
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (): void => {
        setDiscoveryResponse(null);
        setError(null);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            {/* Hero Section */}
            <div className="text-center p-2 md:p-4 flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{t('HomePage.HeroTitle')}</h1>
                {/* Hero Description */}
                <div className="flex flex-col">
                    {(t.raw('HomePage.HeroDescription') as string[]).map((line, index) => (
                        <p key={index} className="text-base text-gray-600 max-w-xl mx-auto">
                            {line}
                        </p>
                    ))}
                </div>
            </div>

            {/* Discovery Form */}
            <div className="mb-8">
                <FestivalDiscoveryForm onSubmit={handleSubmit} onChange={handleChange} isLoading={isLoading} />
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-8 p-4 bg-text-destructive/50 border border-destructive rounded-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <span className="text-destructive">⚠️</span>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-destructive">Error</h3>
                            <p className="mt-1 text-sm text-destructive">{error}</p>
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
                    <RecommendationsList festival={discoveryResponse.festival} recommendations={discoveryResponse.recommendations} />
                </div>
            )}

            {/* Empty State */}
            {!discoveryResponse && !isLoading && !error && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">
                        <Logo className="w-16 h-16 mx-auto" size={40} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('HomePage.EmptyStateTitle')}</h3>
                    <p className="text-gray-600">{t('HomePage.EmptyStateDescription')}</p>
                    <div className="flex flex-col gap-1 mt-4">
                        {((t.raw('HomePage.EmptyStateDisclaimer') as string[]) || [])?.map((line, index) => (
                            <p key={index} className="text-gray-500 text-sm">
                                {line}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
