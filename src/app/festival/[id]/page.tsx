/**
 * Public festival details page
 * Shows festival information, lineup, and schedule for public users
 */
'use client';

import { FestivalDay } from '@/app/festival/[id]/components/festival-day';
import { FestivalFilter } from '@/app/festival/[id]/components/festival-filter';
import { FestivalHero } from '@/app/festival/[id]/components/festival-hero';
import { artistsApi } from '@/app/lib/api-client/artists-api';
import { festivalsApi } from '@/app/lib/api-client/festivals-api';
import { Artist, Festival } from '@/lib/schemas';
import { groupFestivalActsByDate } from '@/lib/utils/festival-util';
import { normalizeForSearch } from '@/lib/utils/normalize-name';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { MdFestival, MdKeyboardArrowUp } from 'react-icons/md';

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
    const [artistInfoMap, setArtistInfoMap] = useState<Record<string, Artist>>({});

    // State for artist info visibility and loading
    const [artistInfoVisible, setArtistInfoVisible] = useState<Record<string, boolean>>({});
    const [artistLoading, setArtistLoading] = useState<Record<string, boolean>>({});

    const [filteredDays, setFilteredDays] = useState<FestivalDay[]>([]);

    // Collapsible state for each day (opened by default)
    const [openDays, setOpenDays] = useState<boolean[]>([]);

    // is 'go to today' button visible
    const [showGotoToday, setShowGotoToday] = useState(false);

    // Scroll to top button state
    const [showScrollToTop, setShowScrollToTop] = useState(false);

    // Calculate days for collapsible state and filter lineup based on search term
    useEffect(() => {
        setFilteredDays(
            festival
                ? searchFilter
                    ? groupFestivalActsByDate(festival)
                          .map(dayLineup => ({
                              // apply search filter
                              ...dayLineup,
                              list: dayLineup.list.filter(
                                  performance =>
                                      normalizeForSearch(performance.artistName)?.includes(normalizeForSearch(searchFilter)) ||
                                      (performance.stage && normalizeForSearch(performance.stage)?.includes(normalizeForSearch(searchFilter)))
                              ),
                          }))
                          .filter(dayLineup => dayLineup.list.length > 0)
                    : groupFestivalActsByDate(festival)
                : []
        );

        setOpenDays(
            festival ? groupFestivalActsByDate(festival).map(() => true) : [] // Open all days by default
        );
    }, [festival, searchFilter]);

    useEffect(() => {
        const loadFestival = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const resolvedParams = await params;

                // Fetch festival details from public API
                const response = await festivalsApi.getFestivalPublic(resolvedParams.id);
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

    // Handle scroll to show/hide scroll to top button
    useEffect(() => {
        const handleScroll = () => {
            // Show button when scrolled down more than X
            setShowScrollToTop(window.scrollY > 500);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        // Show "Go to Today" button if today is within the festival dates
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // Get YYYY-MM-DD format
        const todayLineup = filteredDays.find(day => day.date === todayString);
        setShowGotoToday(!!todayLineup);
    }, [filteredDays]);

    /**
     * Scroll to top of the page smoothly
     */
    const handleScrollToTopClick = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen">
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
            <div className="min-h-screen">
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
            <div className="min-h-screen">
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
        if (artistInfoMap[artistId]) {
            return;
        }

        // Load artist data
        setArtistLoading(prev => ({ ...prev, [key]: true }));
        try {
            const response = await artistsApi.getArtistPublic(artistId);
            if (response.data) {
                setArtistInfoMap(prev => ({ ...prev, [artistId]: response.data as Artist }));
            }
        } finally {
            setArtistLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleGotoTodayClick = () => {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // Get YYYY-MM-DD format
        const todayLineup = filteredDays.find(day => day.date === todayString);
        if (todayLineup) {
            const dayContainer = document.getElementById(`day-container-${filteredDays.indexOf(todayLineup)}`);
            if (dayContainer) {
                dayContainer.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="link-primary mb-4 inline-block">
                        {tCommon('BackToHome')}
                    </Link>

                    {/* Festival Hero Section */}
                    <FestivalHero festival={festival} />
                </div>

                {/* Festival Schedule with Filter */}
                <div className="bg-white rounded-lg shadow-md flex flex-col gap-4">
                    <div className="px-6 pt-4">
                        <h2 className="text-2xl font-bold text-gray-900">{t('FestivalSchedule')}</h2>

                        {/* Search Filter Component */}
                        <FestivalFilter
                            searchFilter={searchFilter}
                            onSearch={setSearchFilter}
                            totalFilteredPerformances={filteredDays.reduce((total, day) => total + day.list.length, 0)}
                            totalPerformances={festival.lineup.length}
                        />
                    </div>

                    {showGotoToday && (
                        <div className="px-6">
                            <button className="link-primary underline font-medium" onClick={handleGotoTodayClick} aria-label={t('GoToToday')}>
                                {t('GoToToday')}
                            </button>
                        </div>
                    )}

                    <div>
                        {groupFestivalActsByDate(festival).length === 0 ? (
                            <div className="text-center py-12">
                                <MdFestival className="mx-auto text-4xl text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('NoLineup')}</h3>
                                <p className="text-gray-600">{t('NoLineupDescription')}</p>
                            </div>
                        ) : searchFilter && filteredDays.length === 0 ? (
                            <div className="text-center py-12">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('NoResults')}</h3>
                                <button onClick={() => setSearchFilter('')} className="mt-4 btn-primary-light">
                                    {t('ClearFilter')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {filteredDays.map((dayLineup, dayIndex) => (
                                    <FestivalDay
                                        key={dayIndex}
                                        dayLineup={dayLineup}
                                        dayIndex={dayIndex}
                                        isOpen={openDays[dayIndex] || false}
                                        onToggle={() => setOpenDays(prev => prev.map((open, idx) => (idx === dayIndex ? !open : open)))}
                                        festival={festival}
                                        artistInfoMap={artistInfoMap}
                                        artistInfoVisible={artistInfoVisible}
                                        artistLoading={artistLoading}
                                        onArtistInfoClick={handleArtistInfoClick}
                                    />
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

                {/* Scroll to Top Button */}
                {showScrollToTop && (
                    <div className="fixed bottom-4 right-4 opacity-50">
                        <button onClick={handleScrollToTopClick} className="p-3 rounded-full bg-primary text-white shadow-md hover:bg-primary/90 transition-all" aria-label="scroll to top">
                            <MdKeyboardArrowUp className="text-2xl" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
