/**
 * Individual festival details page for admin
 * Shows festival information, lineup, and schedule
 */
'use client';

import { festivalsApi } from '@/app/lib/api';
import { AdminLayout } from '@/components/admin/admin-layout';
import { ArtistLinking } from '@/components/admin/artist-linking';
import { ProtectedRoute } from '@/components/protected-route';
import { Festival } from '@/lib/schemas';
import { DATE_TBA, getFestivalArtists, groupFestivalActsByDate } from '@/lib/utils/festival-util';
import Link from 'next/link';
import React, { Usable, useEffect, useState } from 'react';

interface FestivalDetailPageProps {
    params: Usable<{ id: string }>;
}

export default function FestivalDetailPage({ params }: FestivalDetailPageProps) {
    const [festival, setFestival] = useState<Festival | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [linkingActIds, setLinkingActIds] = useState<Set<string> | null>(null);
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

    const handleLinkingSuccess = async (actId: string) => {
        setLinkingActIds(prev => {
            if (!prev) return null; // If no linking is in progress, do nothing
            const updated = new Set(prev);
            updated.delete(actId); // Remove the successfully linked act ID
            return updated.size > 0 ? updated : null; // Return null if no more linking
        });

        // Reload festival data to show the updated artist link
        try {
            const festivalResponse = await festivalsApi.getFestival(id);
            if (festivalResponse.status === 'success' && festivalResponse.data) {
                setFestival(festivalResponse.data as Festival);
            }
        } catch (err) {
            console.error('Error reloading festival:', err);
        }
    };

    const handleLinkingCancel = (id: string) => {
        setLinkingActIds(prev => {
            if (!prev) return null; // If no linking is in progress, do nothing
            const updated = new Set(prev);
            updated.delete(id); // Remove the cancelled act ID
            return updated.size > 0 ? updated : null; // Return null if no more linking
        });
    };

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
                            </div>
                        )}
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-magic"></div>
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
                                                        <div className="text-sm text-foreground">{getFestivalArtists(festival).length}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-3 text-lg">🎭</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-muted-foreground">Festival Days</div>
                                                        <div className="text-sm text-foreground">{groupFestivalActsByDate(festival).length}</div>
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
                                        {groupFestivalActsByDate(festival).map((dayLineup, dayIndex) => (
                                            <div key={dayIndex}>
                                                <h3 className="text-md font-medium text-foreground mb-3">{formatDate(dayLineup.date)}</h3>
                                                <div className="space-y-2">
                                                    {' '}
                                                    {dayLineup.list
                                                        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                                                        .map((artist, index) => (
                                                            <React.Fragment key={index}>
                                                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                                    <div className="flex items-center space-x-4">
                                                                        <div className="text-sm font-medium text-foreground">{artist.time ?? 'TBA'}</div>
                                                                        <div>
                                                                            {artist.artistId ? (
                                                                                <Link href={`/admin/artists/${artist.artistId}`} className="link-primary font-medium">
                                                                                    {artist.artistName}
                                                                                </Link>
                                                                            ) : (
                                                                                <span className="font-medium text-foreground">{artist.artistName}</span>
                                                                            )}
                                                                        </div>
                                                                        {artist.stage && <div className="text-sm text-muted-foreground">@ {artist.stage}</div>}
                                                                    </div>
                                                                    <div className="flex space-x-2">
                                                                        {artist.artistId ? (
                                                                            <Link href={`/admin/artists/${artist.artistId}`} className="btn-primary-light bg-primary/10 px-3 py-2 rounded-3xl text-sm">
                                                                                View Artist
                                                                            </Link>
                                                                        ) : (
                                                                            <>
                                                                                <span className="text-sm text-destructive px-3 py-2">No Artist Profile</span>
                                                                                <button
                                                                                    onClick={() => setLinkingActIds(prev => new Set(prev ? [...prev, artist.id] : [artist.id]))}
                                                                                    disabled={linkingActIds?.has(artist.id)}
                                                                                    className="btn-primary-light bg-primary/10 px-3 py-2 text-sm disabled:opacity-50"
                                                                                >
                                                                                    Link Artist Profile
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {/* Artist Linking Component */}
                                                                {linkingActIds?.has(artist.id) && festival && (
                                                                    <ArtistLinking
                                                                        festivalId={festival.id}
                                                                        festivalUrl={festival.website ? new URL(festival.website).hostname : undefined}
                                                                        actId={artist.id}
                                                                        actName={artist.artistName}
                                                                        onSuccess={() => handleLinkingSuccess(artist.id)}
                                                                        onCancel={() => handleLinkingCancel(artist.id)}
                                                                    />
                                                                )}
                                                            </React.Fragment>
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
