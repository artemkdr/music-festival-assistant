'use client';

import { Artist, Festival, Recommendation } from '@/lib/schemas';
import { isValidDate } from '@/lib/utils/date-util';
import { getFestivalDates } from '@/lib/utils/festival-util';
import { createFestivalEvent, downloadICSFile } from '@/lib/utils/ics-util';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { FaGoogle, FaSpotify, FaYoutube } from 'react-icons/fa';

interface RecommendationsListProps {
    festival: Festival;
    recommendations: Recommendation[];
    onFeedback: (recommendationId: string, artistId: string, rating: 'like' | 'dislike' | 'love' | 'skip') => Promise<void>;
}

/**
 * Component to display festival recommendations
 */
export function RecommendationsList({ festival, recommendations }: RecommendationsListProps): ReactElement {
    const addToGoogleCalendar = async (event: { date: string; time: string; festival: string; artist: string }) => {
        const { date, time, festival, artist } = event;
        const actDateTime = new Date(`${date}T${time}`);
        let formattedStartDate = '';
        let formattedEndDate = '';
        if (isValidDate(actDateTime)) {
            // if actDateTime hours are less than 5:00, it's likely the next day actually,
            // because most festivals start in the afternoon or evening and they don't put the next day date in the time field
            if (actDateTime.getHours() < 5) {
                actDateTime.setDate(actDateTime.getDate() + 1);
            }
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

    const addToGoogleCalendarHandler = (recommendation: Recommendation) => {
        addToGoogleCalendar({
            date: recommendation.act.date || '',
            time: recommendation.act.time || '',
            festival: festival.name,
            artist: recommendation.artist.name,
        });
    };

    const downloadICSCalendar = (event: { date: string; time: string; artist: string; stage?: string }) => {
        const { date, time, artist, stage } = event;

        const eventParams: Parameters<typeof createFestivalEvent>[0] = {
            artistName: artist,
            festivalName: festival.name,
            date,
            time,
        };

        if (stage) {
            eventParams.stage = stage;
        }

        if (festival.location) {
            eventParams.festivalLocation = festival.location;
        }

        if (festival.website) {
            eventParams.festivalWebsite = festival.website;
        }

        const calendarEvent = createFestivalEvent(eventParams);

        const filename = `${artist.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${festival.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        downloadICSFile(calendarEvent, filename);
    };

    const downloadICSCalendarHandler = (recommendation: Recommendation) => {
        const eventData: { date: string; time: string; artist: string; stage?: string } = {
            date: recommendation.act.date || '',
            time: recommendation.act.time || '',
            artist: recommendation.artist.name,
        };
        if (recommendation.act.stage) {
            eventData.stage = recommendation.act.stage;
        }
        try {
            downloadICSCalendar(eventData);
        } catch {
            // @TODO handle error gracefully, maybe show a toast notification
        }
    };

    const { startDate: festivalStartDate, endDate: festivalEndDate } = getFestivalDates(festival);

    const festivalBaseUrl = new URL(festival.website || '').hostname;

    const getGoogleArtistUrl = (artist: Artist): string => {
        return `https://www.google.com/search?q=${encodeURIComponent(artist.name)}%20${festival.website ? `site:${festivalBaseUrl}` : festival.name}`;
    };

    return (
        <div className="space-y-6">
            {/* Festival Header */}
            <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 ">{festival.name}</h2>
                        <p className="text-gray-600 ">{festival.description}</p>
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
                    <div
                        key={`${recommendation.act.id}-${recommendation.artist.id}`}
                        className="bg-gradient-to-br from-violet-50 to-white border-1 border-violet-100 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                        <div className="p-6 flex flex-col gap-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 flex flex-col gap-2">
                                    <h3 className="text-xl font-bold text-gray-900">{recommendation.artist.name}</h3>
                                    <div className="flex flex-wrap gap-2 ">
                                        {recommendation.artist.genre?.map(genre => (
                                            <span key={genre} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                                                {genre}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-gray-600">{recommendation.artist.description}</p>
                                </div>
                            </div>

                            {/* Recommendation Reasons */}
                            <div className="flex flex-col gap-2 p-4 border-1 border-foreground/20 rounded-md">
                                <h4 className="font-medium text-gray-900">Why we recommend this artist:</h4>
                                <ul className="list-disc list-inside text-gray-600 space-y-1 px-4">
                                    {recommendation.reasons.map((reason, index) => (
                                        <li key={index}>{reason}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Act Info */}
                            <div className="bg-gray-200 rounded-md p-4 flex flex-col gap-2">
                                <h4 className="font-medium text-gray-900 ">Performance details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-1 text-sm">
                                    <div>
                                        <span className="text-gray-500">Day:</span>
                                        <span className="ml-2 font-medium">{recommendation.act.date}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Time:</span>
                                        <span className="ml-2 font-medium">{recommendation.act.time}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Stage:</span>
                                        <span className="ml-2 font-medium">{recommendation.act.stage}</span>
                                    </div>
                                </div>
                                {/* Show 'Add to calendars button only if the date is valid */}
                                {isValidDate(new Date(`${recommendation.act.date}T${recommendation.act.time}`)) && (
                                    <div className="flex flex-wrap gap-4 py-2">
                                        <button onClick={() => addToGoogleCalendarHandler(recommendation)} className="link-secondary underline">
                                            Add to Google Agenda
                                        </button>
                                        <button onClick={() => downloadICSCalendarHandler(recommendation)} className="link-secondary underline">
                                            📅 Download calendar event file
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap justify-end gap-4">
                                <div className="flex gap-2">
                                    {recommendation.artist.streamingLinks?.spotify && (
                                        <Link href={recommendation.artist.streamingLinks.spotify} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2">
                                            <FaSpotify />
                                            <span>Spotify</span>
                                        </Link>
                                    )}
                                    {/* Link to youtube search for live from the artist this year */}
                                    <Link
                                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(recommendation.artist.name)} live ${new Date().getFullYear()}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-destructive flex items-center gap-2"
                                    >
                                        <FaYoutube />
                                        <span>YouTube</span>
                                    </Link>

                                    <Link href={getGoogleArtistUrl(recommendation.artist)} target="_blank" rel="noopener noreferrer" className="btn-neutral flex items-center gap-2">
                                        <FaGoogle />
                                        <span>Web Search</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {recommendations.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-4xl ">🔍</div>
                    <h3 className="text-lg font-medium text-gray-900 ">No recommendations found</h3>
                    <p className="text-gray-600">Try adjusting your genre preferences or discovery mode.</p>
                </div>
            )}
        </div>
    );
}
