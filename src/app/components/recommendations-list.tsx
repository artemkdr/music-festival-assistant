'use client';

import { ButtonWithIcon } from '@/app/lib/components/button-with-icon';
import { useAuth } from '@/lib/contexts/auth-context';
import { Festival, Recommendation } from '@/lib/schemas';
import { addToGoogleCalendar, downloadICSCalendar } from '@/lib/utils/agenda-util';
import { extractStartTime, formatDateString, isValidDate } from '@/lib/utils/date-util';
import { DATE_TBA, getFestivalDates, getGoogleArtistUrl, getYouTubeSearchArtistUrl } from '@/lib/utils/festival-util';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { FaGoogle, FaSpotify, FaYoutube } from 'react-icons/fa';
import { LuCalendarArrowDown } from 'react-icons/lu';
import { MdDateRange, MdLocationOn } from 'react-icons/md';
import { RiMusicAiFill } from 'react-icons/ri';

interface RecommendationsListProps {
    festival: Festival;
    recommendations: Recommendation[];
}

/**
 * Component to display festival recommendations
 */
export function RecommendationsList({ festival, recommendations }: RecommendationsListProps): ReactElement {
    const t = useTranslations('Recommendations');
    const { isAdmin } = useAuth();

    const addToGoogleCalendarHandler = (recommendation: Recommendation) => {
        addToGoogleCalendar({
            date: recommendation.act.date || '',
            time: recommendation.act.time || '',
            festival: festival.name,
            artist: recommendation.artist.name,
            stage: recommendation.act.stage || festival.location || '',
        });
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
            downloadICSCalendar(festival, eventData);
        } catch {
            // @TODO handle error gracefully, maybe show a toast notification
        }
    };

    const { startDate: festivalStartDate, endDate: festivalEndDate } = getFestivalDates(festival);

    return (
        <div className="space-y-6">
            {/* Disclaimer */}
            <div className="bg-accent/70 border-l-4 border-yellow-300 p-4 text-yellow-800">
                <p className="text-sm">
                    <strong>{t('DisclaimerTitle')}</strong> {t('DisclaimerText')}
                </p>
            </div>
            {/* Festival Header */}
            <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg shadow-md p-6">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold text-foreground">{festival.name}</h2>
                    <div className="flex flex-wrap gap-2 text-sm text-foreground/70">
                        <div className="flex items-center gap-2">
                            <span className="text-primary">
                                <MdLocationOn size={24} />
                            </span>
                            <span className="text-left">{festival.location}</span>
                        </div>
                        {festival.lineup && festival.lineup.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-primary">
                                    <MdDateRange size={24} />
                                </span>
                                <span className="text-left">
                                    {formatDateString(festivalStartDate || DATE_TBA)} - {formatDateString(festivalEndDate || DATE_TBA)}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-primary">
                                <RiMusicAiFill size={24} />
                            </span>
                            <span className="text-left">{recommendations.length > 0 ? t('RecommendationsTitle', { count: recommendations.length }) : t('NoRecommendationsTitle')}</span>
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
                                            <span key={genre} className="px-2 py-1 text-xs bg-magic/10 text-foreground rounded-md">
                                                {genre}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Recommendation Reasons */}
                            <div className="flex flex-col gap-2 p-4 border-1 border-foreground/20 rounded-md">
                                <h4 className="font-medium text-gray-900">{t('ReasonTitle')}</h4>
                                <ul className="list-disc list-inside text-gray-600 space-y-1 px-4">
                                    {recommendation.reasons.map((reason, index) => (
                                        <li key={index}>{reason}</li>
                                    ))}
                                </ul>
                            </div>

                            <Link href={getGoogleArtistUrl(recommendation.artist.name, festival.website, festival.name)} target="_blank" rel="noopener noreferrer" className="link-primary underline">
                                {t('SearchArtist')} <strong>{recommendation.artist.name}</strong>
                            </Link>
                            {isAdmin && (
                                <Link href={`/admin/artists/${recommendation.artist.id}/edit`} target="_blank" rel="noopener noreferrer" className="link-primary underline">
                                    {t('EditArtist')}
                                </Link>
                            )}

                            {/* Act Info */}
                            <div className="bg-gradient-to-br from-magic/10 to-muted/20 rounded-md p-4 flex flex-col gap-2">
                                <h4 className="font-medium text-gray-900">{t('ArtistPerformance')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-1 text-sm">
                                    <div>
                                        <span className="text-gray-500">{t('Date')}:</span>
                                        <span className="ml-2 font-medium">{formatDateString(recommendation.act.date || DATE_TBA)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">{t('Time')}:</span>
                                        <span className="ml-2 font-medium">{recommendation.act.time}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">{t('Stage')}:</span>
                                        <span className="ml-2 font-medium">{recommendation.act.stage}</span>
                                    </div>
                                </div>
                                {/* Show 'Add to calendars button only if the date is valid */}
                                {isValidDate(new Date(`${recommendation.act.date}T${extractStartTime(recommendation.act.time || '19:00')}`)) && (
                                    <div className="flex flex-wrap gap-4 py-2">
                                        <ButtonWithIcon
                                            icon={<LuCalendarArrowDown size={20} />}
                                            onClick={() => downloadICSCalendarHandler(recommendation)}
                                            label={t('DownloadICS')}
                                            className="link-secondary underline"
                                        />
                                        <ButtonWithIcon
                                            icon={<FaGoogle size={20} />}
                                            onClick={() => addToGoogleCalendarHandler(recommendation)}
                                            label={t('AddToGoogleCalendar')}
                                            className="link-secondary underline"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap md:justify-end gap-2 md:gap-4">
                                {recommendation.artist.streamingLinks?.spotify && (
                                    <Link href={recommendation.artist.streamingLinks.spotify} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2">
                                        <FaSpotify />
                                        <span>Spotify</span>
                                    </Link>
                                )}
                                {/* Link to youtube search for live from the artist this year */}
                                <Link href={getYouTubeSearchArtistUrl(recommendation.artist.name)} target="_blank" rel="noopener noreferrer" className="btn-destructive flex items-center gap-2">
                                    <FaYoutube />
                                    <span>YouTube</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {recommendations.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-4xl ">🔍</div>
                    <h3 className="text-lg font-medium text-gray-900 ">{t('NoRecommendationsTitle')}</h3>
                    <p className="text-gray-600">{t('NoRecommendationsDescription')}</p>
                </div>
            )}
        </div>
    );
}
