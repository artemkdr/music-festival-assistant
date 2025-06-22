/**
 * Individual artist details page for admin
 * Shows artist information, genres, and associated festivals
 */
'use client';

import { AdminLayout } from '@/components/admin/admin-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { apiClient } from '@/lib/api/client';
import { useState, useEffect } from 'react';

interface Artist {
    id: string;
    name: string;
    genres: string[];
    spotifyId?: string;
    imageUrl?: string;
    bio?: string;
    popularity?: number;
    externalUrls?: {
        spotify?: string;
    };
    followers?: number;
}

interface Performance {
    festivalId: string;
    festivalName: string;
    date?: string;
    time?: string;
    stage?: string;
}

interface ArtistDetailPageProps {
    params: { id: string };
}

export default function ArtistDetailPage({ params }: ArtistDetailPageProps) {
    const [artist, setArtist] = useState<Artist | null>(null);
    const [performances, setPerformances] = useState<Performance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadArtist();
    }, [params.id]);

    const loadArtist = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Fetch artist details from API
            const artistResponse = await apiClient.getArtist(params.id);
            
            if (artistResponse.status !== 'success' || !artistResponse.data) {
                throw new Error(artistResponse.message || 'Failed to fetch artist details');
            }

            // Fetch artist performances from API
            const performancesResponse = await apiClient.getArtistPerformances(params.id);
            
            if (performancesResponse.status !== 'success') {
                console.warn('Failed to fetch performances:', performancesResponse.message);
                // Continue without performances data instead of failing completely
            }

            setArtist(artistResponse.data as Artist);
            setPerformances((performancesResponse.data as Performance[]) || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load artist');
            console.error('Error loading artist:', err);
        } finally {
            setIsLoading(false);
        }
    };

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

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    return (
        <ProtectedRoute requireAdmin>
            <AdminLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <a href="/admin/artists" className="text-gray-500 hover:text-gray-700">
                                    ← Back to Artists
                                </a>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900">{isLoading ? 'Loading...' : artist?.name || 'Artist Not Found'}</h1>
                        </div>
                        {artist && (
                            <div className="flex space-x-3">
                                <a href={`/admin/artists/${artist.id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                                    Edit Artist
                                </a>
                                {artist.externalUrls?.spotify && (
                                    <a
                                        href={artist.externalUrls.spotify}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                    >
                                        View on Spotify
                                    </a>
                                )}
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

                                                {artist.genres.length > 0 && (
                                                    <div className="flex items-start">
                                                        <span className="mr-3 text-lg mt-1">🎵</span>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-500 mb-2">Genres</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {artist.genres.map(genre => (
                                                                    <span key={genre} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                                        {genre}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {artist.spotifyId && (
                                                    <div className="flex items-center">
                                                        <span className="mr-3 text-lg">🟢</span>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-500">Spotify ID</div>
                                                            <div className="text-sm text-gray-900 font-mono">{artist.spotifyId}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Stats */}
                                            <div className="grid grid-cols-2 gap-4">
                                                {artist.popularity && (
                                                    <div className="bg-purple-50 p-4 rounded-lg">
                                                        <div className="text-2xl font-bold text-purple-600">{artist.popularity}/100</div>
                                                        <div className="text-sm text-purple-600">Popularity</div>
                                                    </div>
                                                )}

                                                {artist.followers && (
                                                    <div className="bg-green-50 p-4 rounded-lg">
                                                        <div className="text-2xl font-bold text-green-600">{formatNumber(artist.followers)}</div>
                                                        <div className="text-sm text-green-600">Followers</div>
                                                    </div>
                                                )}
                                            </div>

                                            {artist.bio && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 mb-2">Biography</div>
                                                    <p className="text-sm text-gray-900 leading-relaxed">{artist.bio}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Festival Performances */}
                            <div className="bg-white shadow rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">Festival Performances</h2>
                                    {performances.length > 0 ? (
                                        <div className="space-y-3">
                                            {performances.map((performance, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center space-x-4">
                                                        <span className="text-2xl">🎪</span>
                                                        <div>
                                                            <a href={`/admin/festivals/${performance.festivalId}`} className="text-blue-600 hover:text-blue-800 font-medium">
                                                                {performance.festivalName}
                                                            </a>
                                                            <div className="text-sm text-gray-600 space-x-2">
                                                                {performance.date && <span>{formatDate(performance.date)}</span>}
                                                                {performance.time && <span>• {formatTime(performance.time)}</span>}
                                                                {performance.stage && <span>• {performance.stage}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <a href={`/admin/festivals/${performance.festivalId}`} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                                                        View Festival
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <span className="text-4xl mb-4 block">🎪</span>
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No festival performances</h3>
                                            <p className="text-gray-600">This artist is not currently associated with any festivals.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* External Links */}
                            {artist.externalUrls && (
                                <div className="bg-white shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <h2 className="text-lg font-medium text-gray-900 mb-4">External Links</h2>
                                        <div className="space-y-2">
                                            {artist.externalUrls.spotify && (
                                                <a
                                                    href={artist.externalUrls.spotify}
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
            </AdminLayout>
        </ProtectedRoute>
    );
}
