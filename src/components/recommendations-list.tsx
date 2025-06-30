'use client';

import { Artist, Festival, Recommendation } from '@/lib/schemas';
import { isValidDate } from '@/lib/utils/date-util';
import { getFestivalDates } from '@/lib/utils/festival-util';
import Link from 'next/link';
import type { ReactElement } from 'react';

interface RecommendationsListProps {
    festival: Festival;
    recommendations: Recommendation[];
    onFeedback: (recommendationId: string, artistId: string, rating: 'like' | 'dislike' | 'love' | 'skip') => Promise<void>;
}

/**
 * Component to display festival recommendations
 */
export function RecommendationsList({ festival, recommendations }: RecommendationsListProps): ReactElement {
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

    const addToGoogleCalendar = async (event: { date: string; time: string; festival: string; artist: string }) => {
        const { date, time, festival, artist } = event;
        const actDateTime = new Date(`${date}T${time}`);
        let formattedStartDate = '';
        let formattedEndDate = '';
        if (isValidDate(actDateTime)) {
            // Format as YYYYMMDDTHHMMSSZ
            formattedStartDate = actDateTime.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
            // add 1 hour for end time
            const endDate = new Date(actDateTime);
            endDate.setHours(endDate.getHours() + 1);
            formattedEndDate = endDate.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
        }
        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(artist)} at ${encodeURIComponent(festival)}&dates=${formattedStartDate}/${formattedEndDate}`;
        window.open(calendarUrl, '_blank');
    };

    const { startDate: festivalStartDate, endDate: festivalEndDate } = getFestivalDates(festival);

    const festivalBaseUrl = new URL(festival.website || '').hostname;

    const getGoogleArtistUrl = (artist: Artist): string => {
        return `https://www.google.com/search?q=${encodeURIComponent(artist.name)}%20${festival.website ? `site:${festivalBaseUrl}` : festival.name}`;
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
                            {festival.lineup && festival.lineup.length > 0 && (
                                <span>
                                    📅 {festivalStartDate} - {festivalEndDate}
                                </span>
                            )}
                            <span>🎵 {recommendations.length} recommendations</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="grid gap-6">
                {recommendations.map(recommendation => (
                    <div key={`${recommendation.act.id}-${recommendation.artist.id}`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-gray-900">{recommendation.artist.name}</h3>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(recommendation.score)}`}>{getScoreLabel(recommendation.score)}</span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {recommendation.artist.genre?.map(genre => (
                                            <span key={genre} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                                                {genre}
                                            </span>
                                        ))}
                                        {recommendation.aiTags &&
                                            recommendation.aiTags.map(tag => (
                                                <span key={tag} className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded-md border border-purple-200">
                                                    ✨ {tag}
                                                </span>
                                            ))}
                                    </div>

                                    <p className="text-gray-600 mb-4">{recommendation.artist.description}</p>
                                </div>
                            </div>

                            {/* Act Info */}
                            <div className="bg-gray-200 rounded-lg p-4 mb-4">
                                <h4 className="font-medium text-gray-900 mb-2">Act Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Stage:</span>
                                        <span className="ml-2 font-medium">{recommendation.act.stage}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Day:</span>
                                        <span className="ml-2 font-medium">{recommendation.act.date}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Time:</span>
                                        <span className="ml-2 font-medium">{recommendation.act.time}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendation Reasons */}
                            <div className="mb-4">
                                <h4 className="font-medium text-gray-900 mb-2">Why we recommend this artist:</h4>
                                <ul className="list-disc list-inside text-gray-600 space-y-1 px-4">
                                    {recommendation.reasons.map((reason, index) => (
                                        <li key={index}>{reason}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap justify-between gap-4">
                                {/* Show 'Add to calendars button only if the date is valid */}
                                {isValidDate(new Date(`${recommendation.act.date}T${recommendation.act.time}`)) && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() =>
                                                addToGoogleCalendar({
                                                    date: recommendation.act.date || '',
                                                    time: recommendation.act.time || '',
                                                    festival: festival.name,
                                                    artist: recommendation.artist.name,
                                                })
                                            }
                                            className="link-secondary border-1 border-secondary px-4 py-1 rounded-xl"
                                        >
                                            Add to Google calendar
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    {recommendation.artist.streamingLinks?.spotify && (
                                        <a href={recommendation.artist.streamingLinks.spotify} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                                            🎵 Spotify
                                        </a>
                                    )}
                                    {recommendation.artist.streamingLinks?.appleMusic && (
                                        <a href={recommendation.artist.streamingLinks.appleMusic} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                                            🍎 Apple Music
                                        </a>
                                    )}
                                    {recommendation.artist.streamingLinks?.youtube && (
                                        <a href={recommendation.artist.streamingLinks.youtube} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                                            📺 YouTube
                                        </a>
                                    )}
                                    <Link href={getGoogleArtistUrl(recommendation.artist)} target="_blank" rel="noopener noreferrer" className="btn-primary">
                                        🌐 Web Search
                                    </Link>
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
