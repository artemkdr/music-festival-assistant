/**
 * Public festival details page
 * Shows festival information, lineup, and schedule for public users
 */
'use client';

import { festivalsApi } from '@/app/lib/api';
import { Festival } from '@/lib/schemas';
import { DATE_TBA, getFestivalArtists, getFestivalDates, groupFestivalActsByDate } from '@/lib/utils/festival-util';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { FaGoogle, FaYoutube } from 'react-icons/fa';
import { GiLoveSong } from 'react-icons/gi';
import { MdCalendarToday, MdFestival, MdLanguage, MdLocationOn } from 'react-icons/md';
import { TbClock, TbMoodSing } from 'react-icons/tb';

interface FestivalPageProps {
    params: Promise<{ id: string }>;
}

/**
 * Public festival page component displaying lineup and schedule
 */
export default function FestivalPage({ params }: FestivalPageProps): React.ReactElement {
    const [festival, setFestival] = useState<Festival | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchFilter, setSearchFilter] = useState<string>('');

    useEffect(() => {
        const loadFestival = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const resolvedParams = await params;

                // Fetch festival details from public API
                const response = await festivalsApi.getPublicFestival(resolvedParams.id);
                if (response.data) {
                    setFestival(response.data as Festival);
                } else {
                    throw new Error('Failed to fetch festival details');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load festival');
                console.error('Error loading festival:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadFestival();
    }, [params]);

    /**
     * Format date string for display
     */
    const formatDate = (dateString: string) => {
        if (dateString === DATE_TBA) {
            return 'Date To Be Announced';
        }
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

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
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <p className="mt-1 text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 text-center">
                        <Link href="/" className="link-primary">
                            ← Back to Home
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
                        <h2 className="text-2xl font-bold text-gray-900">Festival Not Found</h2>
                        <p className="text-gray-600 mt-2">The festival you&apos;re looking for doesn&apos;t exist.</p>
                        <Link href="/" className="mt-4 link-primary">
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const { startDate, endDate } = getFestivalDates(festival);
    const totalArtists = getFestivalArtists(festival).length;
    const totalDays = groupFestivalActsByDate(festival).length;

    const festivalBaseUrl = new URL(festival.website || '').hostname;

    const getGoogleArtistUrl = (artistName: string): string => {
        return `https://www.google.com/search?q=${encodeURIComponent(artistName)}%20${festival.website ? `site:${festivalBaseUrl}` : festival.name}`;
    };

    /**
     * Filter lineup based on search term
     */
    const filteredLineup = groupFestivalActsByDate(festival)
        .map(dayLineup => ({
            ...dayLineup,
            list: dayLineup.list.filter(
                performance => performance.artistName.toLowerCase().includes(searchFilter.toLowerCase()) || (performance.stage && performance.stage.toLowerCase().includes(searchFilter.toLowerCase()))
            ),
        }))
        .filter(dayLineup => dayLineup.list.length > 0);

    const totalFilteredPerformances = filteredLineup.reduce((total, day) => total + day.list.length, 0);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="link-primary mb-4 inline-block">
                        ← Back to Home
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
                                    <div className="text-sm text-gray-600">Duration</div>
                                    <div className="font-semibold">{startDate && endDate && startDate !== endDate ? `${totalDays} days` : '1 day'}</div>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <TbMoodSing className="text-primary text-xl" />
                                    </div>
                                    <div className="text-sm text-gray-600">Artists</div>
                                    <div className="font-semibold">{totalArtists}</div>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <GiLoveSong className="text-primary text-xl" />
                                    </div>
                                    <div className="text-sm text-gray-600">Performances</div>
                                    <div className="font-semibold">{festival.lineup.length}</div>
                                </div>
                                {festival.website && (
                                    <div className="text-center">
                                        <div className="flex items-center justify-center mb-2">
                                            <MdLanguage className="text-primary text-xl" />
                                        </div>
                                        <Link href={festival.website} target="_blank" rel="noopener noreferrer" className="font-semibold link-primary text-sm underline">
                                            View website
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        {festival.description && (
                            <div className="px-6 pb-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-900 mb-2">About the Festival</h3>
                                    <p className="text-gray-700">{festival.description}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Festival Schedule */}
                <div className="bg-white rounded-lg shadow-md">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900">Festival Lineup</h2>
                        <p className="text-gray-600 mt-1">Complete schedule and artist information</p>

                        {/* Search Filter */}
                        <div className="mt-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search artists or stages..."
                                    value={searchFilter}
                                    onChange={e => setSearchFilter(e.target.value)}
                                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
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
                                        <span>No performances match your search</span>
                                    ) : (
                                        <span>
                                            Showing {totalFilteredPerformances} of {festival.lineup.length} performances
                                            <button onClick={() => setSearchFilter('')} className="ml-2 text-primary hover:text-primary/80 underline">
                                                Clear filter
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
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No lineup available</h3>
                                <p className="text-gray-600">The festival lineup hasn&apos;t been announced yet.</p>
                            </div>
                        ) : searchFilter && filteredLineup.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="mx-auto text-4xl text-gray-400 mb-4 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                                <p className="text-gray-600">No artists or stages match &quot;{searchFilter}&quot;. Try a different search term.</p>
                                <button onClick={() => setSearchFilter('')} className="mt-4 btn-primary-light">
                                    Clear search
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {(searchFilter ? filteredLineup : groupFestivalActsByDate(festival)).map((dayLineup, dayIndex) => (
                                    <div key={dayIndex}>
                                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                            <MdCalendarToday className="mr-2 text-primary" />
                                            {formatDate(dayLineup.date)}
                                        </h3>

                                        <div className="grid gap-3">
                                            {dayLineup.list
                                                .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                                                .map((performance, index) => (
                                                    <div key={index} className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="flex flex-col gap-1.5 items-center text-sm text-gray-600 pt-1">
                                                                <TbClock />
                                                                {performance.time}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="font-semibold text-gray-900">{performance.artistName}</div>
                                                                {performance.stage && <div className="text-sm text-gray-600 flex items-center">{performance.stage}</div>}
                                                            </div>
                                                        </div>

                                                        {/* spotify link, youtube live serach link, google search link */}
                                                        <div className="flex justify-end space-x-4">
                                                            <Link
                                                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(performance.artistName)} live ${new Date().getFullYear()}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="link-destructive underline flex items-center gap-2"
                                                                title="Watch on YouTube Live"
                                                            >
                                                                <FaYoutube />
                                                                <span>YouTube</span>
                                                            </Link>

                                                            <Link
                                                                href={getGoogleArtistUrl(performance.artistName)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="link-neutral underline flex items-center gap-2"
                                                            >
                                                                <FaGoogle />
                                                                <span>Web Search</span>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Call to Action */}
                <div className="mt-8 text-center">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-primary mb-2">Want Personalized Recommendations?</h3>
                        <p className="text-gray-700 mb-4">Get AI-powered artist recommendations based on your music preferences for this festival.</p>
                        <Link href={`/?festival=${festival.id}`} className="btn-primary inline-flex items-center">
                            <MdFestival className="mr-2" />
                            Get My Recommendations
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
