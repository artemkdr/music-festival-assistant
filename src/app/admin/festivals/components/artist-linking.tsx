/**
 * Artist Linking Component
 * Provides inline search and linking functionality for festival acts
 */
'use client';

import { artistsApi, festivalsApi, spotifyApi } from '@/app/lib/api';
import { Artist } from '@/lib/schemas';
import { SpotifyArtist } from '@/lib/services/spotify/spotify-service';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface ArtistLinkingProps {
    festivalId: string;
    festivalUrl?: string | undefined; // Optional URL for linking to Google search
    actId: string;
    actName: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export function ArtistLinking({ festivalId, festivalUrl, actId, actName, onSuccess, onCancel }: ArtistLinkingProps) {
    const [searchQuery, setSearchQuery] = useState(actName);
    const [dbArtists, setDbArtists] = useState<Artist[]>([]);
    const [spotifyArtists, setSpotifyArtists] = useState<SpotifyArtist[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);

    const searchArtists = useCallback(async (query: string) => {
        if (!query.trim()) {
            setDbArtists([]);
            setSpotifyArtists([]);
            setSearchPerformed(false);
            return;
        }

        setIsSearching(true);
        setSearchPerformed(true);

        try {
            // Search both our database and Spotify in parallel
            const [dbResponse, spotifyResponse] = await Promise.all([artistsApi.searchArtists(query), spotifyApi.searchArtists(query)]);

            // Handle database results
            if (dbResponse.status === 'success') {
                setDbArtists(dbResponse.data?.artists || []);
            } else {
                setDbArtists([]);
            }

            // Handle Spotify results
            if (spotifyResponse.status === 'success') {
                setSpotifyArtists(spotifyResponse.data?.artists || []);
            } else {
                setSpotifyArtists([]);
            }
        } catch {
            setDbArtists([]);
            setSpotifyArtists([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const linkArtist = async (artistId?: string, spotifyData?: SpotifyArtist) => {
        setIsLinking(true);

        try {
            const requestData: {
                actId: string;
                artistName: string;
                artistId?: string;
                spotifyData?: SpotifyArtist;
            } = {
                actId,
                artistName: actName,
            };

            if (artistId) {
                requestData.artistId = artistId;
            } else if (spotifyData) {
                requestData.spotifyData = spotifyData;
            }

            const response = await festivalsApi.linkArtistToAct(festivalId, requestData);

            if (response.status === 'success') {
                onSuccess();
            } else {
                alert(`Linking failed: ${response.message}`);
            }
        } catch {
            alert('An error occurred while linking the artist');
        } finally {
            setIsLinking(false);
        }
    };

    // Auto-search when component mounts
    useEffect(() => {
        searchArtists(actName);
    }, [actName, searchArtists]);

    return (
        <div className="bg-white border rounded-lg p-4 mt-2 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">Link Artist Profile</h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" disabled={isLinking}>
                    ✕
                </button>
            </div>

            <div className="space-y-4">
                {/* Search Input */}
                <div>
                    <label htmlFor="artist-search" className="block text-sm font-medium text-gray-700 mb-1">
                        Search for &quot;{actName}&quot;
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="artist-search"
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && searchArtists(searchQuery)}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Enter artist name to search..."
                            disabled={isLinking}
                        />
                        <button
                            onClick={() => searchArtists(searchQuery)}
                            disabled={isSearching || isLinking}
                            className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isSearching ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </div>

                {/* link to google search */}
                {searchPerformed && (
                    <div className="text-sm text-gray-500 mt-2">
                        <Link href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' site:' + festivalUrl)}`} target="_blank" className="link-primary">
                            Search on Google
                        </Link>
                    </div>
                )}

                {/* Search Results */}
                {searchPerformed && (
                    <div className="space-y-4">
                        {/* Database Artists */}
                        {dbArtists.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">🎵 Artists in Our Database ({dbArtists.length})</h4>
                                <div className="space-y-2">
                                    {dbArtists.map(artist => (
                                        <div key={artist.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                                            <div className="flex items-center space-x-3">
                                                {artist.imageUrl && <Image src={artist.imageUrl} alt={artist.name} width={40} height={40} className="w-10 h-10 rounded-sm  object-cover" />}
                                                <div>
                                                    <div className="font-medium text-gray-900">{artist.name}</div>
                                                    {artist.genre && artist.genre.length > 0 && <div className="text-sm text-gray-500">{artist.genre.slice(0, 2).join(', ')}</div>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => linkArtist(artist.id)}
                                                disabled={isLinking}
                                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {isLinking ? 'Linking...' : 'Link Existing'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Spotify Artists */}
                        {spotifyArtists.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">🎧 Spotify Artists ({spotifyArtists.length})</h4>
                                <div className="space-y-2">
                                    {spotifyArtists.map(artist => (
                                        <div key={artist.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                                            <div className="flex flex-col gap-2">
                                                <div className="font-medium text-gray-900">
                                                    {artist.name} ({artist.id})
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        {artist.imageUrl && <Image src={artist.imageUrl} alt={artist.name} width={40} height={40} className="w-10 h-10 rounded-sm  object-cover" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <Link href={artist.spotifyUrl} target="_blank" className="link-primary">
                                                            View in Spotify
                                                        </Link>
                                                        {artist.genres.length > 0 && <div className="text-sm text-gray-500">{artist.genres.slice(0, 2).join(', ')}</div>}
                                                        <div className="text-xs text-gray-400">{artist.followers.toLocaleString()} followers</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => linkArtist(undefined, artist)}
                                                disabled={isLinking}
                                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {isLinking ? 'Creating...' : 'Create & Link'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No Results */}
                        {dbArtists.length === 0 && spotifyArtists.length === 0 && !isSearching && (
                            <div className="text-center py-8 text-gray-500">
                                <div className="text-2xl mb-2">🔍</div>
                                <div>No artists found for &quot;{searchQuery}&quot;</div>
                                <div className="text-sm mt-1">Try a different search term</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {isSearching && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-magic mx-auto"></div>
                        <div className="text-gray-500 mt-2">Searching artists...</div>
                    </div>
                )}
            </div>
        </div>
    );
}
