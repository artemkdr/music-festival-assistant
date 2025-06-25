/**
 * Artists management page for admin
 * Lists all artists with options to view, edit, and crawl new ones
 */
'use client';

import { AdminLayout } from '@/app/components/admin/admin-layout';
import { ProtectedRoute } from '@/app/components/protected-route';
import { ArtistDetails, artistsApi } from '@/app/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function ArtistsPage() {
    const [artists, setArtists] = useState<ArtistDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Load artists on component mount
    useEffect(() => {
        loadArtists();
    }, []);

    const loadArtists = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await artistsApi.getArtists();

            if (response.status === 'success' && response.data) {
                setArtists(response.data);
            } else {
                setError(response.message || 'Failed to load artists');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load artists');
        } finally {
            setIsLoading(false);
        }
    };

    // Get unique genres for filter dropdown
    const uniqueGenres = Array.from(new Set(artists.flatMap(artist => artist.genre))).sort();

    // Filter artists based on search term and genre filter
    const filteredArtists = artists.filter(artist => {
        const matchesSearch = artist.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    return (
        <ProtectedRoute requireAdmin>
            <AdminLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Artists</h1>
                            <p className="mt-2 text-gray-600">Manage artist data and crawl new artists from Spotify</p>
                        </div>
                        <div className="flex space-x-3">
                            <Link href="/admin/artists/crawl" className="btn-secondary">
                                🎤 Crawl Artists
                            </Link>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white shadow rounded-lg p-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="search">Search Artists</label>
                                <input
                                    type="text"
                                    name="search"
                                    id="search"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Search by artist name..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <span className="text-2xl">🎤</span>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Total Artists</dt>
                                            <dd className="text-lg font-medium text-blue-600">{artists.length}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <span className="text-2xl">🎵</span>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Unique Genres</dt>
                                            <dd className="text-lg font-medium text-green-600">{uniqueGenres.length}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <span className="text-2xl">🟢</span>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">With Spotify Data</dt>
                                            <dd className="text-lg font-medium text-purple-600">{artists.filter(a => a.mappingIds?.spotify).length}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

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

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {/* Artists Grid */}
                    {!isLoading && !error && (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredArtists.map(artist => (
                                <div key={artist.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                                    <div className="px-4 py-5 sm:p-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-lg font-medium text-gray-900 truncate">{artist.name}</h3>
                                            <div className="flex items-center space-x-1">
                                                {artist.mappingIds?.spotify && (
                                                    <span className="text-green-500" title="Has Spotify data">
                                                        🟢
                                                    </span>
                                                )}
                                                <span className="text-2xl">🎤</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                                            <div>
                                                <span className="font-medium">Genres:</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {artist.genre?.slice(0, 3).map(genre => (
                                                        <span key={genre} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            {genre}
                                                        </span>
                                                    ))}
                                                    {artist.genre?.length > 3 && <span className="text-xs text-gray-500">+{artist.genre.length - 3} more</span>}
                                                </div>
                                            </div>
                                            {/*artist.popularity && (
                                                <div className="flex items-center">
                                                    <span className="mr-2">📊</span>
                                                    Popularity: {artist.popularity.spotify}/100
                                                </div>
                                            )*/}
                                        </div>

                                        <div className="flex space-x-2">
                                            <Link href={`/admin/artists/${artist.id}`} className="flex-1 text-center text-sm px-3 py-2 link-primary link-primary bg-primary/20 rounded-3xl">
                                                View Details
                                            </Link>
                                            <Link href={`/admin/artists/${artist.id}/edit`} className="flex-1 text-center text-sm px-3 py-2 link-secondary bg-secondary/20 rounded-3xl">
                                                Edit
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !error && filteredArtists.length === 0 && (
                        <div className="text-center py-12">
                            <span className="text-6xl mb-4 block">🎤</span>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{searchTerm ? 'No artists match your filters' : 'No artists found'}</h3>
                            <p className="text-gray-600 mb-6">
                                {searchTerm ? 'Try adjusting your search or filter criteria.' : 'Get started by crawling artists from Spotify or adding them manually.'}
                            </p>
                            {!searchTerm && (
                                <Link href="/admin/artists/crawl" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                                    Crawl Your First Artists
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </AdminLayout>
        </ProtectedRoute>
    );
}
