/**
 * Individual artist details page for admin
 * Shows artist information, genres, and associated festivals
 */
'use client';

import { artistsApi } from '@/app/lib/api';
import { Artist, FestivalAct } from '@/lib/schemas';
import Link from 'next/link';
import React, { Usable, useEffect, useState } from 'react';
import { MdFestival } from 'react-icons/md';

interface ArtistDetailPageProps {
    params: Usable<{ id: string }>;
}

export default function ArtistDetailPage({ params }: ArtistDetailPageProps) {
    const [artist, setArtist] = useState<Artist | null>(null);
    const [acts, setActs] = useState<FestivalAct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { id } = React.use(params);

    useEffect(() => {
        const loadArtist = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch artist details from API
                const artistResponse = await artistsApi.getArtist(id);

                if (artistResponse.status !== 'success' || !artistResponse.data) {
                    throw new Error(artistResponse.message || 'Failed to fetch artist details');
                }

                // Fetch artist acts from API
                const actsResponse = await artistsApi.getArtistActs(id);

                if (actsResponse.status !== 'success') {
                    console.warn('Failed to fetch acts:', actsResponse.message);
                    // Continue without acts data instead of failing completely
                }

                setArtist(artistResponse.data as Artist);
                setActs((actsResponse.data as FestivalAct[]) || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load artist');
            } finally {
                setIsLoading(false);
            }
        };
        loadArtist();
    }, [id]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatTime = (timeString: string) => {
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <Link href="/admin/artists" className="link-neutral">
                            ← Back to Artists
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">{isLoading ? 'Loading...' : artist?.name || 'Artist Not Found'}</h1>
                </div>
                {artist && (
                    <div className="flex space-x-3">
                        <Link href={`/admin/artists/${artist.id}/edit`} className="btn-primary">
                            Edit Artist
                        </Link>
                        {artist.streamingLinks?.spotify && (
                            <Link href={artist.streamingLinks.spotify} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                                View on Spotify
                            </Link>
                        )}
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

            {/* Artist Details */}
            {artist && !isLoading && (
                <div className="space-y-6">
                    {/* Overview Card */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Artist Overview</h2>
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <div className="space-y-4">
                                    {/* Basic Info */}
                                    <div className="space-y-3">
                                        <div className="flex items-center">
                                            <span className="mr-3 text-lg">🎤</span>
                                            <div>
                                                <div className="text-sm font-medium text-gray-500">Artist Name</div>
                                                <div className="text-lg font-semibold text-gray-900">{artist.name}</div>
                                            </div>
                                        </div>

                                        {!!artist.genre?.length && (
                                            <div className="flex items-start">
                                                <span className="mr-3 text-lg mt-1">🎵</span>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 mb-2">Genres</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {artist.genre?.map(genre => (
                                                            <span key={genre} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                                {genre}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {artist.mappingIds?.spotify && (
                                            <div className="flex items-center">
                                                <span className="mr-3 text-lg">🟢</span>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500">Spotify ID</div>
                                                    <div className="text-sm text-gray-900 font-mono">{artist.mappingIds.spotify}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {artist.description && (
                                        <div>
                                            <div className="text-sm font-medium text-gray-500 mb-2">Description</div>
                                            <p className="text-sm text-gray-900 leading-relaxed">{artist.description}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Festival acts */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Festival Live Acts</h2>
                            {acts.length > 0 ? (
                                <div className="space-y-3">
                                    {acts.map((act, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-4">
                                                <span className="text-2xl">
                                                    <MdFestival />
                                                </span>
                                                <div>
                                                    <a href={`/admin/festivals/${act.festivalId}`} className="text-blue-600 hover:text-blue-800 font-medium">
                                                        {act.festivalName}
                                                    </a>
                                                    <div className="text-sm text-gray-600 space-x-2">
                                                        {act.date && <span>{formatDate(act.date)}</span>}
                                                        {act.time && <span>• {formatTime(act.time)}</span>}
                                                        {act.stage && <span>• {act.stage}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <Link href={`/admin/festivals/${act.festivalId}`} className="btn-primary-light border-1 border-primary">
                                                View Festival
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <span className="text-4xl mb-4 block">
                                        <MdFestival />
                                    </span>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No festival live acts</h3>
                                    <p className="text-gray-600">This artist is not currently associated with any festivals.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* External Links */}
                    {artist.streamingLinks && (
                        <div className="bg-white shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Streaming Links</h2>
                                <div className="space-y-2">
                                    {artist.streamingLinks.spotify && (
                                        <a
                                            href={artist.streamingLinks.spotify}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center space-x-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                        >
                                            <span className="text-2xl">🟢</span>
                                            <div>
                                                <div className="text-sm font-medium text-green-800">Spotify</div>
                                                <div className="text-sm text-green-600">Listen on Spotify</div>
                                            </div>
                                            <span className="ml-auto text-green-500">→</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
