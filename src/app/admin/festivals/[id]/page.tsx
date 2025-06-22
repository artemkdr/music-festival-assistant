/**
 * Individual festival details page for admin
 * Shows festival information, lineup, and schedule
 */
'use client';

import { AdminLayout } from '@/components/admin/admin-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import React, { useState, useEffect, Usable } from 'react';

interface Festival {
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
    website?: string;
    description?: string;
    performances: Array<{
        id: string;
        artistId: string;
        artist: { name: string; id: string };
        startTime: string; // ISO string
        endTime: string; // ISO string
        stage: string;
        day: number; // Festival day (1, 2, 3, etc.)
    }>;
}

interface FestivalDetailPageProps {
    params: Usable<{ id: string }>;
}

export default function FestivalDetailPage({ params }: FestivalDetailPageProps) {
    const [festival, setFestival] = useState<Festival | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { id } = React.use(params);

    useEffect(() => {
        const loadFestival = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch festival details from API
                const festivalResponse = await apiClient.getFestival(id);

                if (festivalResponse.status !== 'success' || !festivalResponse.data) {
                    throw new Error(festivalResponse.message || 'Failed to fetch festival details');
                }

                setFestival(festivalResponse.data as Festival);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load festival');
                console.error('Error loading festival:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadFestival();
    }, [id]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Helper function to get date for a performance based on festival start date and day
    const getPerformanceDate = (festival: Festival, day: number): string => {
        const startDate = new Date(festival.startDate);
        const performanceDate = new Date(startDate);
        performanceDate.setDate(startDate.getDate() + (day - 1));
        return performanceDate.toISOString().split('T')[0] || festival.startDate;
    };

    // Group performances by date and stage
    const performancesByDate =
        festival?.performances.reduce(
            (acc, perf) => {
                const date = getPerformanceDate(festival, perf.day);
                if (!acc[date]) acc[date] = [];
                acc[date].push(perf);
                return acc;
            },
            {} as Record<string, typeof festival.performances>
        ) || {};

    return (
        <ProtectedRoute requireAdmin>
            <AdminLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <Link href="/admin/festivals" className="text-gray-500 hover:text-gray-700">
                                    ← Back to Festivals
                                </Link>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900">{isLoading ? 'Loading...' : festival?.name || 'Festival Not Found'}</h1>
                        </div>
                        {festival && (
                            <div className="flex space-x-3">
                                <Link href={`/admin/festivals/${festival.id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                                    Edit Festival
                                </Link>
                                <Link href={`/admin/artists/crawl?festivalId=${festival.id}`} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                                    Crawl Artists
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
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
                    )}

                    {/* Festival Details */}
                    {festival && !isLoading && (
                        <div className="space-y-6">
                            {/* Overview Card */}
                            <div className="bg-white shadow rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">Festival Overview</h2>
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div>
                                            <div className="space-y-3">
                                                <div className="flex items-center">
                                                    <span className="mr-3 text-lg">📍</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-500">Location</div>
                                                        <div className="text-sm text-gray-900">{festival.location}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-3 text-lg">📅</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-500">Dates</div>
                                                        <div className="text-sm text-gray-900">
                                                            {formatDate(festival.startDate)} - {formatDate(festival.endDate)}
                                                        </div>
                                                    </div>
                                                </div>
                                                {festival.website && (
                                                    <div className="flex items-center">
                                                        <span className="mr-3 text-lg">🌐</span>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-500">Website</div>
                                                            <Link href={festival.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800">
                                                                {festival.website}
                                                            </Link>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="space-y-3">
                                                <div className="flex items-center">
                                                    <span className="mr-3 text-lg">🎤</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-500">Total Artists</div>
                                                        <div className="text-sm text-gray-900">{festival.performances.length}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-3 text-lg">🎭</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-500">Performances</div>
                                                        <div className="text-sm text-gray-900">{festival.performances.length}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            {festival.description && (
                                                <div className="mt-4">
                                                    <div className="text-sm font-medium text-gray-500 mb-1">Description</div>
                                                    <p className="text-sm text-gray-900">{festival.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Schedule by Date */}
                            <div className="bg-white shadow rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">Festival Schedule</h2>
                                    <div className="space-y-6">
                                        {Object.entries(performancesByDate).map(([date, performances]) => (
                                            <div key={date}>
                                                <h3 className="text-md font-medium text-gray-900 mb-3">{formatDate(date)}</h3>
                                                <div className="space-y-2">
                                                    {performances
                                                        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                                                        .map((performance, index) => (
                                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                                <div className="flex items-center space-x-4">
                                                                    <div className="text-sm font-medium text-gray-900">{performance.startTime ?? 'TBA'}</div>
                                                                    <div>
                                                                        <Link href={`/admin/artists/${performance.artist.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                                                                            {performance.artist.name}
                                                                        </Link>
                                                                    </div>
                                                                    {performance.stage && <div className="text-sm text-gray-500">@ {performance.stage}</div>}
                                                                </div>
                                                                <div className="flex space-x-2">
                                                                    <Link href={`/admin/artists/${performance.artist.id}`} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                                        View Artist
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </AdminLayout>
        </ProtectedRoute>
    );
}
