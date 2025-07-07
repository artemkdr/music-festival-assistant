/**
 * Public festival details page
 * Shows festival information, lineup, and schedule for public users
 */
'use client';

import { ArtistInfo } from '@/app/festival/[id]/components/artist-info';
import { artistsApi } from '@/app/lib/api';
import { discoverApi } from '@/app/lib/api/discover-api';
import { ButtonWithIcon } from '@/components/button-with-icon';
import { Artist, Festival } from '@/lib/schemas';
import { addToGoogleCalendar, downloadICSCalendar } from '@/lib/utils/agenda-util';
import { extractStartTime, formatDateString, isValidDate } from '@/lib/utils/date-util';
import { getFestivalArtists, groupFestivalActsByDate } from '@/lib/utils/festival-util';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { FaGoogle, FaInfoCircle } from 'react-icons/fa';
import { GiLoveSong } from 'react-icons/gi';
import { LuCalendarArrowDown } from 'react-icons/lu';
import { MdCalendarToday, MdExpandLess, MdFestival, MdLanguage, MdLocationOn } from 'react-icons/md';
import { TbClock, TbMoodSing } from 'react-icons/tb';

interface FestivalPageProps {
    params: Promise<{ id: string }>;
}

interface FestivalDay {
    date: string;
    list: {
        artistName: string;
        artistId?: string;
        stage?: string;
        time?: string;
        date?: string;
    }[];
}

/**
 * Public festival page component displaying lineup and schedule
 */
export default function FestivalPage({ params }: FestivalPageProps): React.ReactElement {
    const t = useTranslations('FestivalPage');
    const tCommon = useTranslations('Common');

    const [festival, setFestival] = useState<Festival | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchFilter, setSearchFilter] = useState<string>('');
    const [artistMap, setArtistMap] = useState<Record<string, Artist>>({});

    // State for artist info visibility and loading
    const [artistInfoVisible, setArtistInfoVisible] = useState<Record<string, boolean>>({});
    const [artistLoading, setArtistLoading] = useState<Record<string, boolean>>({});

    const [allDays, setAllDays] = useState<FestivalDay[]>([]);

    // Calculate days for collapsible state
    useEffect(() => {
        setAllDays(
            festival
                ? searchFilter
                    ? groupFestivalActsByDate(festival)
                          .map(dayLineup => ({
                              ...dayLineup,
                              list: dayLineup.list.filter(
                                  performance =>
                                      performance.artistName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                                      (performance.stage && performance.stage.toLowerCase().includes(searchFilter.toLowerCase()))
                              ),
                          }))
                          .filter(dayLineup => dayLineup.list.length > 0)
                    : groupFestivalActsByDate(festival)
                : []
        );
    }, [festival, searchFilter]);

    // Collapsible state for each day (opened by default)
    const [openDays, setOpenDays] = useState<boolean[]>([]);

    // Update openDays when allDays changes
    useEffect(() => {
        setOpenDays(allDays.map(() => true));
    }, [allDays]);

    useEffect(() => {
        const loadFestival = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const resolvedParams = await params;

                // Fetch festival details from public API
                const response = await discoverApi.getPublicFestival(resolvedParams.id);
                if (response.data) {
                    setFestival(response.data as Festival);
                } else {
                    throw new Error('Failed to fetch festival details');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load festival');
            } finally {
                setIsLoading(false);
            }
        };

        loadFestival();
    }, [params]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-magic"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <span className="text-red-400">⚠️</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">{tCommon('Error')}</h3>
                                <p className="mt-1 text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 text-center">
                        <Link href="/" className="link-primary">
                            {tCommon('BackToHome')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Festival not found
    if (!festival) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold text-gray-900">{t('NotFound')}</h2>
                        <p className="text-gray-600 mt-2">{t('NotFoundDescription')}</p>
                        <Link href="/" className="mt-4 link-primary">
                            {tCommon('BackToHome')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }
    const totalArtists = getFestivalArtists(festival).length;
    const totalDays = groupFestivalActsByDate(festival).length;

    /**
     * Filter lineup based on search term
     */
    const filteredLineup = allDays;

    const totalFilteredPerformances = filteredLineup.reduce((total, day) => total + day.list.length, 0);

    /**
     * Handle artist info button click
     */
    const handleArtistInfoClick = async (performance: { artistId?: string; artistName: string }, dayIndex: number, performanceIndex: number) => {
        const key = `${dayIndex}-${performanceIndex}`;
        const artistId = performance.artistId;
        // Toggle visibility
        if (artistInfoVisible[key]) {
            setArtistInfoVisible(prev => ({ ...prev, [key]: false }));
            return;
        }

        // Show artist info
        setArtistInfoVisible(prev => ({ ...prev, [key]: true }));

        // If no artistId, create a fake artist object
        if (!artistId) {
            return;
        }

        // If artist already loaded, don't load again
        if (artistMap[artistId]) {
            return;
        }

        // Load artist data
        setArtistLoading(prev => ({ ...prev, [key]: true }));
        try {
            const response = await artistsApi.getArtistPublic(artistId);
            if (response.data) {
                setArtistMap(prev => ({ ...prev, [artistId]: response.data as Artist }));
            }
        } finally {
            setArtistLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const addToGoogleCalendarHandler = (act: { date: string; time: string; artist: string; stage?: string }) => {
        addToGoogleCalendar({
            date: act.date || '',
            time: act.time || '',
            festival: festival.name,
            artist: act.artist,
            stage: act.stage || festival.location || '',
        });
    };

    const downloadICSCalendarHandler = (act: { date: string; time: string; artist: string; stage?: string }) => {
        const eventData: { date: string; time: string; artist: string; stage?: string } = {
            date: act.date || '',
            time: act.time || '',
            artist: act.artist,
        };
        if (act.stage) {
            eventData.stage = act.stage;
        }
        try {
            downloadICSCalendar(festival, eventData);
        } catch {
            // @TODO handle error gracefully, maybe show a toast notification
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="link-primary mb-4 inline-block">
                        {tCommon('BackToHome')}
                    </Link>

                    {/* Festival Hero Section */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {festival.imageUrl && (
                            <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${festival.imageUrl})` }}>
                                <div className="h-full bg-gradient-to-t from-black/50 to-transparent flex items-end">
                                    <div className="p-6 text-white">
                                        <h1 className="text-3xl font-bold mb-2">{festival.name}</h1>
                                        <p className="text-lg opacity-90">{festival.location}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!festival.imageUrl && (
                            <div className="p-6 border-b border-gray-200">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                                    <MdFestival className="mr-3 text-primary" />
                                    {festival.name}
                                </h1>
                                <p className="text-lg text-gray-600 flex items-center">
                                    <MdLocationOn className="mr-2" />
                                    {festival.location}
                                </p>
                            </div>
                        )}

                        {/* Festival Stats */}
                        <div className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <MdCalendarToday className="text-primary text-xl" />
                                    </div>
                                    <div className="text-sm text-gray-600">{t('FestivalSchedule')}</div>
                                    <div className="font-semibold">{totalDays > 0 ? t('TotalDays', { count: totalDays }) : ''}</div>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <TbMoodSing className="text-primary text-xl" />
                                    </div>
                                    <div className="text-sm text-gray-600">{t('TotalArtists')}</div>
                                    <div className="font-semibold">{totalArtists}</div>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <GiLoveSong className="text-primary text-xl" />
                                    </div>
                                    <div className="text-sm text-gray-600">{t('Performances')}</div>
                                    <div className="font-semibold">{festival.lineup.length}</div>
                                </div>
                                {festival.website && (
                                    <div className="text-center">
                                        <div className="flex items-center justify-center mb-2">
                                            <MdLanguage className="text-primary text-xl" />
                                        </div>
                                        <Link href={festival.website} target="_blank" rel="noopener noreferrer" className="font-semibold link-primary text-sm underline">
                                            {t('VisitWebsite')}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        {festival.description && (
                            <div className="px-6 pb-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-900 mb-2">{t('AboutFestival')}</h3>
                                    <p className="text-gray-700">{festival.description}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Festival Schedule */}
                <div className="bg-white rounded-lg shadow-md">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900">{t('FestivalSchedule')}</h2>
                        {/* Search Filter */}
                        <div className="mt-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={t('SearchByArtistOrStage')}
                                    value={searchFilter}
                                    onChange={e => setSearchFilter(e.target.value)}
                                    className="w-full px-4 py-2 pr-10 border rounded-md"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                            {searchFilter && (
                                <div className="mt-2 text-sm text-gray-600">
                                    {totalFilteredPerformances === 0 ? (
                                        <span>{t('NoResults')}</span>
                                    ) : (
                                        <span>
                                            {t('ShowingResults', { count: totalFilteredPerformances, total: festival.lineup.length })}{' '}
                                            <button onClick={() => setSearchFilter('')} className="ml-2 text-primary hover:text-primary/80 underline">
                                                {t('ClearFilter')}
                                            </button>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6">
                        {groupFestivalActsByDate(festival).length === 0 ? (
                            <div className="text-center py-12">
                                <MdFestival className="mx-auto text-4xl text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('NoLineup')}</h3>
                                <p className="text-gray-600">{t('NoLineupDescription')}</p>
                            </div>
                        ) : searchFilter && filteredLineup.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="mx-auto text-4xl text-gray-400 mb-4 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('NoResults')}</h3>
                                <button onClick={() => setSearchFilter('')} className="mt-4 btn-primary-light">
                                    {t('ClearFilter')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {allDays.map((dayLineup, dayIndex) => (
                                    <div key={dayIndex} className="flex flex-col gap-2 border-1 border-primary/20 p-2 rounded-lg">
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between text-left focus:outline-none hover:bg-gray-100 p-2 rounded"
                                            onClick={() => setOpenDays(prev => prev.map((open, idx) => (idx === dayIndex ? !open : open)))}
                                            aria-expanded={openDays[dayIndex]}
                                            aria-controls={`day-lineup-${dayIndex}`}
                                        >
                                            <span className="flex items-center text-xl font-bold text-gray-900">
                                                <MdCalendarToday className="mr-2 text-primary" />
                                                {formatDateString(dayLineup.date, undefined, tCommon('TBA'))}
                                            </span>
                                            {<MdExpandLess size={32} className={`text-primary transition-transform ${openDays[dayIndex] ? '' : 'transform rotate-180'}`} />}
                                        </button>
                                        {openDays[dayIndex] && (
                                            <div className="grid gap-3" id={`day-lineup-${dayIndex}`}>
                                                {dayLineup.list
                                                    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                                                    .map((performance, index) => (
                                                        <div key={index} className="flex flex-col gap-4 p-4 bg-primary/6 rounded-lg hover:bg-primary/15 transition-colors">
                                                            <div className="flex space-x-4">
                                                                <div className="flex flex-col">
                                                                    <div className="font-semibold text-gray-900">{performance.artistName}</div>
                                                                    <div className="flex flex-row gap-1 items-center text-sm text-gray-600">
                                                                        <TbClock size={12} />
                                                                        <span>{performance.time || tCommon('TBA')}</span>
                                                                        {performance.stage && (
                                                                            <>
                                                                                <span className="text-foreground/30">|</span>
                                                                                <span className="text-sm text-gray-600">{performance.stage}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Show 'Add to calendars button only if the date is valid */}
                                                            {isValidDate(new Date(`${dayLineup.date}T${extractStartTime(performance.time || '19:00')}`)) && (
                                                                <div className="flex flex-wrap gap-4 py-2">
                                                                    <ButtonWithIcon
                                                                        icon={<LuCalendarArrowDown size={20} />}
                                                                        label={t('DownloadICS')}
                                                                        onClick={() =>
                                                                            downloadICSCalendarHandler({
                                                                                date: dayLineup.date,
                                                                                time: performance.time || '20:00',
                                                                                artist: performance.artistName,
                                                                                stage: performance.stage || festival.location || '',
                                                                            })
                                                                        }
                                                                        className="link-secondary underline"
                                                                    />
                                                                    <ButtonWithIcon
                                                                        icon={<FaGoogle size={20} />}
                                                                        label={t('AddToGoogleCalendar')}
                                                                        onClick={() =>
                                                                            addToGoogleCalendarHandler({
                                                                                date: dayLineup.date,
                                                                                time: performance.time || '20:00',
                                                                                artist: performance.artistName,
                                                                                stage: performance.stage || festival.location || '',
                                                                            })
                                                                        }
                                                                        className="link-secondary underline"
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="flex flex-wrap justify-end gap-2 items-center">                                                                
                                                                {artistInfoVisible[`${dayIndex}-${index}`] &&
                                                                    (() => {
                                                                        const artist = (performance.artistId && artistMap[performance.artistId]
                                                                            ? artistMap[performance.artistId]
                                                                            : artistMap[`${dayIndex}-${index}`]) ?? {
                                                                            id: '',
                                                                            name: performance.artistName,
                                                                        };
                                                                        return <ArtistInfo festival={festival} artist={artist} />;
                                                                    })()}
                                                                <button
                                                                    onClick={() => handleArtistInfoClick(performance, dayIndex, index)}
                                                                    title={t('ShowArtistInfo')}
                                                                    className={`link-primary bg-primary/15 rounded-full transition-all p-2 ${
                                                                        artistLoading[`${dayIndex}-${index}`] ? 'animate-bounce [animation-duration:_.4s]' : ''
                                                                    }`}
                                                                    disabled={artistLoading[`${dayIndex}-${index}`]}
                                                                >
                                                                    <FaInfoCircle size={26} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Call to Action */}
                <div className="mt-8 text-center">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-primary mb-2">{t('CallToActionTitle')}</h3>
                        <p className="text-gray-700 mb-4">{t('CallToActionDescription')}</p>
                        <Link href={`/?festival=${festival.id}`} className="btn-primary inline-flex items-center">
                            <MdFestival className="mr-2" />
                            {t('GetRecommendations')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
