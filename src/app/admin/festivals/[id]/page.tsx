/**
 * Individual festival details page for admin
 * Shows festival information, lineup, and schedule
 */
'use client';

import { AdminLayout } from '@/app/components/admin/admin-layout';
import { ProtectedRoute } from '@/app/components/protected-route';
import { Festival, festivalsApi } from '@/app/lib/api';
import Link from 'next/link';
import React, { useState, useEffect, Usable } from 'react';

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
                const festivalResponse = await festivalsApi.getFestival(id);

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
                                <Link href="/admin/festivals" className="link-neutral">
                                    ← Back to Festivals
                                </Link>
                            </div>
                            <h1 className="text-3xl font-bold text-foreground">{isLoading ? 'Loading...' : festival?.name || 'Festival Not Found'}</h1>
                        </div>
                        {festival && (
                            <div className="flex space-x-3">
                                <Link href={`/admin/festivals/${festival.id}/edit`} className="btn-primary">
                                    Edit Festival
                                </Link>
                                <Link href={`/admin/artists/crawl?festivalId=${festival.id}`} className="btn-secondary">
                                    Crawl Artists
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                                    <h2 className="text-lg font-medium text-foreground mb-4">Festival Overview</h2>
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div>
                                            <div className="space-y-3">
                                                <div className="flex items-center">
                                                    <span className="mr-3 text-lg">📍</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-muted-foreground">Location</div>
                                                        <div className="text-sm text-foreground">{festival.location}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-3 text-lg">📅</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-muted-foreground">Dates</div>
                                                        <div className="text-sm text-foreground">
                                                            {formatDate(festival.startDate)} - {formatDate(festival.endDate)}
                                                        </div>
                                                    </div>
                                                </div>
                                                {festival.website && (
                                                    <div className="flex items-center">
                                                        <span className="mr-3 text-lg">🌐</span>
                                                        <div>
                                                            <div className="text-sm font-medium text-muted-foreground">Website</div>
                                                            <Link href={festival.website} target="_blank" rel="noopener noreferrer" className="link-primary text-sm">
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
                                                        <div className="text-sm font-medium text-muted-foreground">Total Artists</div>
                                                        <div className="text-sm text-foreground">{festival.performances.length}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-3 text-lg">🎭</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-muted-foreground">Performances</div>
                                                        <div className="text-sm text-foreground">{festival.performances.length}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            {festival.description && (
                                                <div className="mt-4">
                                                    <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                                                    <p className="text-sm text-foreground">{festival.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Schedule by Date */}
                            <div className="bg-white shadow rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    <h2 className="text-lg font-medium text-foreground mb-4">Festival Schedule</h2>
                                    <div className="space-y-6">
                                        {Object.entries(performancesByDate).map(([date, performances]) => (
                                            <div key={date}>
                                                <h3 className="text-md font-medium text-foreground mb-3">{formatDate(date)}</h3>
                                                <div className="space-y-2">
                                                    {performances
                                                        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                                                        .map((performance, index) => (
                                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                                <div className="flex items-center space-x-4">
                                                                    <div className="text-sm font-medium text-foreground">{performance.startTime ?? 'TBA'}</div>
                                                                    <div>
                                                                        <Link href={`/admin/artists/${performance.artist.id}`} className="link-primary font-medium">
                                                                            {performance.artist.name}
                                                                        </Link>
                                                                    </div>
                                                                    {performance.stage && <div className="text-sm text-muted-foreground">@ {performance.stage}</div>}
                                                                </div>
                                                                <div className="flex space-x-2">
                                                                    <Link href={`/admin/artists/${performance.artist.id}`} className="btn-primary-light bg-primary/10 px-3 py-2 rounded-3xl text-sm">
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
