'use client';

import type { ReactElement } from 'react';
import type { Festival, Recommendation } from '@/types';

interface RecommendationsListProps {
    festival: Festival;
    recommendations: Recommendation[];
    onFeedback: (recommendationId: string, artistId: string, rating: 'like' | 'dislike' | 'love' | 'skip') => Promise<void>;
}

/**
 * Component to display festival recommendations
 */
export function RecommendationsList({ festival, recommendations, onFeedback }: RecommendationsListProps): ReactElement {
    const formatTime = (timeString: string): string => {
        return new Date(timeString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (timeString: string): string => {
        return new Date(timeString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const getScoreColor = (score: number): string => {
        if (score >= 0.8) return 'text-green-600 bg-green-100';
        if (score >= 0.6) return 'text-blue-600 bg-blue-100';
        if (score >= 0.4) return 'text-yellow-600 bg-yellow-100';
        return 'text-gray-600 bg-gray-100';
    };

    const getScoreLabel = (score: number): string => {
        if (score >= 0.8) return 'Highly Recommended';
        if (score >= 0.6) return 'Recommended';
        if (score >= 0.4) return 'Worth Checking Out';
        return 'Might Interest You';
    };

    return (
        <div className="space-y-6">
            {/* Festival Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">{festival.name}</h2>
                        <p className="text-gray-600 mb-4">{festival.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span>📍 {festival.location}</span>
                            <span>
                                📅 {formatDate(festival.startDate)} - {formatDate(festival.endDate)}
                            </span>
                            <span>🎵 {recommendations.length} recommendations</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="grid gap-6">
                {recommendations.map(recommendation => (
                    <div key={recommendation.performance.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-gray-900">{recommendation.artist.name}</h3>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(recommendation.score)}`}>{getScoreLabel(recommendation.score)}</span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {recommendation.artist.genre.map(genre => (
                                            <span key={genre} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                                                {genre}
                                            </span>
                                        ))}
                                    </div>

                                    <p className="text-gray-600 mb-4">{recommendation.artist.description}</p>
                                </div>
                            </div>

                            {/* Performance Info */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <h4 className="font-medium text-gray-900 mb-2">Performance Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Stage:</span>
                                        <span className="ml-2 font-medium">{recommendation.performance.stage}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Day:</span>
                                        <span className="ml-2 font-medium">Day {recommendation.performance.day}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Time:</span>
                                        <span className="ml-2 font-medium">
                                            {formatTime(recommendation.performance.startTime)} - {formatTime(recommendation.performance.endTime)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendation Reasons */}
                            <div className="mb-4">
                                <h4 className="font-medium text-gray-900 mb-2">Why we recommend this artist:</h4>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                    {recommendation.reasons.map((reason, index) => (
                                        <li key={index}>{reason}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onFeedback(recommendation.performance.id, recommendation.artist.id, 'love')}
                                        className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                        title="Love this recommendation"
                                    >
                                        ❤️ Love
                                    </button>
                                    <button
                                        onClick={() => onFeedback(recommendation.performance.id, recommendation.artist.id, 'like')}
                                        className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                                        title="Like this recommendation"
                                    >
                                        👍 Like
                                    </button>
                                    <button
                                        onClick={() => onFeedback(recommendation.performance.id, recommendation.artist.id, 'dislike')}
                                        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                                        title="Not interested"
                                    >
                                        👎 Pass
                                    </button>
                                    <button
                                        onClick={() => onFeedback(recommendation.performance.id, recommendation.artist.id, 'skip')}
                                        className="px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
                                        title="Skip for now"
                                    >
                                        ⏭️ Skip
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    {recommendation.artist.spotifyUrl && (
                                        <a
                                            href={recommendation.artist.spotifyUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                        >
                                            🎵 Spotify
                                        </a>
                                    )}
                                    {recommendation.artist.socialLinks?.website && (
                                        <a
                                            href={recommendation.artist.socialLinks.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            🌐 Website
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {recommendations.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations found</h3>
                    <p className="text-gray-600">Try adjusting your genre preferences or discovery mode.</p>
                </div>
            )}
        </div>
    );
}
