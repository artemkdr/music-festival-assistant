/**
 * Festival edit page for admin
 * Allows editing of festival information, dates, and description
 */
'use client';

import { AdminLayout } from '@/components/admin/admin-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { artistsApi, festivalsApi, spotifyApi, SpotifySearchResult } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import type { Artist, Festival, Performance } from '@/lib/api/types';

interface FestivalFormData {
    name?: string;
    location?: string;
    startDate?: string | undefined; // Date string in YYYY-MM-DD format for inputs
    endDate?: string | undefined; // Date string in YYYY-MM-DD format for inputs
    website?: string | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
}

interface PerformanceFormData {
    id?: string;
    artistId: string;
    artistName: string;
    isNewArtist: boolean;
    startDate: string; // YYYY-MM-DD format
    startTime: string; // HH:MM format
    endDate: string; // YYYY-MM-DD format
    endTime: string; // HH:MM format
    stage: string;
    day: number;
}

interface FestivalEditPageProps {
    params: Promise<{ id: string }>;
}

export default function FestivalEditPage({ params }: FestivalEditPageProps) {
    const [festival, setFestival] = useState<Festival | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FestivalFormData>({});
    const [id, setId] = useState<string>('');

    // Performance editing state
    const [performances, setPerformances] = useState<Performance[]>([]);
    const [availableArtists, setAvailableArtists] = useState<Artist[]>([]);
    const [isEditingPerformance, setIsEditingPerformance] = useState(false);
    const [editingPerformanceId, setEditingPerformanceId] = useState<string | null>(null);
    const [performanceFormData, setPerformanceFormData] = useState<PerformanceFormData>({
        artistId: '',
        artistName: '',
        isNewArtist: false,
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        stage: '',
        day: 1,
    });

    // --- Spotify Search State and Logic ---
    const [spotifySearchResults, setSpotifySearchResults] = useState<SpotifySearchResult[]>([]);
    const [isSpotifySearching, setIsSpotifySearching] = useState(false);
    const [spotifySearchError, setSpotifySearchError] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        const loadFestival = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const resolvedParams = await params;
                setId(resolvedParams.id);

                // Load festival and artists in parallel
                const [festivalResponse, artistsResponse] = await Promise.all([festivalsApi.getFestival(resolvedParams.id), artistsApi.getArtists()]);

                if (festivalResponse.status !== 'success' || !festivalResponse.data) {
                    throw new Error(festivalResponse.message || 'Failed to fetch festival details');
                }

                if (artistsResponse.status !== 'success' || !artistsResponse.data) {
                    throw new Error(artistsResponse.message || 'Failed to fetch artists');
                }

                const festivalData = festivalResponse.data as Festival;
                const artistsData = artistsResponse.data as Artist[];

                setFestival(festivalData);
                setPerformances(festivalData.performances || []);
                setAvailableArtists(artistsData);

                // Convert ISO dates to date input format (YYYY-MM-DD)
                const startDateForInput = festivalData.startDate ? festivalData.startDate.split('T')[0] : '';
                const endDateForInput = festivalData.endDate ? festivalData.endDate.split('T')[0] : '';

                setFormData({
                    name: festivalData.name,
                    location: festivalData.location,
                    startDate: startDateForInput,
                    endDate: endDateForInput,
                    website: festivalData.website,
                    description: festivalData.description,
                    imageUrl: festivalData.imageUrl,
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load festival');
                console.error('Error loading festival:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadFestival();
    }, [params]);
    const handleInputChange = (field: keyof FestivalFormData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value || undefined,
        }));
    };

    const handlePerformanceInputChange = (field: keyof PerformanceFormData, value: string | boolean | number) => {
        setPerformanceFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleAddNewPerformance = () => {
        setEditingPerformanceId(null);
        setPerformanceFormData({
            artistId: '',
            artistName: '',
            isNewArtist: false,
            startDate: formData.startDate || '',
            startTime: '',
            endDate: formData.endDate || '',
            endTime: '',
            stage: '',
            day: 1,
        });
        setIsEditingPerformance(true);
    };

    const handleEditPerformance = (performance: Performance) => {
        setEditingPerformanceId(performance.id);
        const start = new Date(performance.startTime);
        const end = new Date(performance.endTime);

        setPerformanceFormData({
            id: performance.id,
            artistId: performance.artistId,
            artistName: performance.artist.name,
            isNewArtist: false,
            startDate: start.toISOString().split('T')[0] || '',
            startTime: start.toTimeString().substring(0, 5),
            endDate: end.toISOString().split('T')[0] || '',
            endTime: end.toTimeString().substring(0, 5),
            stage: performance.stage,
            day: performance.day,
        });
        setIsEditingPerformance(true);
    };

    const handleDeletePerformance = (performanceId: string) => {
        setPerformances(prev => prev.filter(p => p.id !== performanceId));
    };

    const handleCancelEditPerformance = () => {
        setIsEditingPerformance(false);
        setEditingPerformanceId(null);
    };

    const handleSavePerformance = () => {
        const { startDate, startTime, endDate, endTime, artistId, artistName, stage, day, isNewArtist, id } = performanceFormData;

        if ((!artistId && !isNewArtist) || (isNewArtist && !artistName) || !startDate || !startTime || !endDate || !endTime || !stage) {
            setError('Please fill all required performance fields.');
            return;
        }

        const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
        const endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

        let finalArtistId = artistId;
        let finalArtistName = '';

        if (isNewArtist) {
            // For new artists, we'll use a temporary ID and the provided name.
            // The backend will handle creating the new artist.
            finalArtistId = `new-artist-${Date.now()}`;
            finalArtistName = artistName;
        } else {
            const existingArtist = availableArtists.find(a => a.id === artistId);
            if (existingArtist) {
                finalArtistName = existingArtist.name;
            }
        }

        const newPerformance: Performance = {
            id: id || `perf-${Date.now()}`,
            artistId: finalArtistId,
            artist: { id: finalArtistId, name: finalArtistName },
            startTime: startDateTime,
            endTime: endDateTime,
            stage: stage,
            day: day,
        };

        if (editingPerformanceId) {
            // Update existing performance
            setPerformances(prev => prev.map(p => (p.id === editingPerformanceId ? newPerformance : p)));
        } else {
            // Add new performance
            setPerformances(prev => [...prev, newPerformance]);
        }

        handleCancelEditPerformance();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setIsSaving(true);
            setError(null);

            // Convert dates back to ISO format
            const cleanedFormData = {
                ...formData,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : '',
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : '',
                performances: performances,
            };

            const response = await festivalsApi.updateFestival(id, cleanedFormData);

            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to update festival');
            }

            // Redirect back to festival detail page
            router.push(`/admin/festivals/${id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save festival');
            console.error('Error saving festival:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Spotify Search Logic ---
    const searchSpotifyArtist = async (query: string) => {
        setIsSpotifySearching(true);
        setSpotifySearchError(null);
        setSpotifySearchResults([]);
        try {
            const response = await spotifyApi.searchArtists(query);
            setSpotifySearchResults(response.data || []);
        } catch {
            setSpotifySearchError('Spotify search failed');
        } finally {
            setIsSpotifySearching(false);
        }
    };

    const handleSelectSpotifyArtist = (artist: SpotifySearchResult) => {
        setPerformanceFormData(prev => ({
            ...prev,
            artistName: artist.name,
            // Optionally set genre/imageUrl if you want to use them
        }));
        setSpotifySearchResults([]);
    };

    if (isLoading) {
        return (
            <ProtectedRoute requireAdmin>
                <AdminLayout>
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                </AdminLayout>
            </ProtectedRoute>
        );
    }

    if (!festival) {
        return (
            <ProtectedRoute requireAdmin>
                <AdminLayout>
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold text-gray-900">Festival Not Found</h2>
                        <p className="text-gray-600 mt-2">The festival you&apos;re looking for doesn&apos;t exist.</p>
                        <Link href="/admin/festivals" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md">
                            Back to Festivals
                        </Link>
                    </div>
                </AdminLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute requireAdmin>
            <AdminLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <Link href={`/admin/festivals/${id}`} className="text-gray-500 hover:text-gray-700">
                                    ← Back to {festival.name}
                                </Link>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900">Edit Festival</h1>
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

                    {/* Edit Form */}
                    <div className="bg-white shadow rounded-lg">
                        <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-6">
                            {/* Basic Information */}
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                            Festival Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            required
                                            value={formData.name || ''}
                                            onChange={e => handleInputChange('name', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                                            Location *
                                        </label>
                                        <input
                                            type="text"
                                            id="location"
                                            required
                                            value={formData.location || ''}
                                            onChange={e => handleInputChange('location', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="City, State/Country"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                                            Start Date *
                                        </label>
                                        <input
                                            type="date"
                                            id="startDate"
                                            required
                                            value={formData.startDate || ''}
                                            onChange={e => handleInputChange('startDate', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                                            End Date *
                                        </label>
                                        <input
                                            type="date"
                                            id="endDate"
                                            required
                                            value={formData.endDate || ''}
                                            onChange={e => handleInputChange('endDate', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                                            Website URL
                                        </label>
                                        <input
                                            type="url"
                                            id="website"
                                            value={formData.website || ''}
                                            onChange={e => handleInputChange('website', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="https://example.com"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
                                            Image URL
                                        </label>
                                        <input
                                            type="url"
                                            id="imageUrl"
                                            value={formData.imageUrl || ''}
                                            onChange={e => handleInputChange('imageUrl', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        rows={4}
                                        value={formData.description || ''}
                                        onChange={e => handleInputChange('description', e.target.value)}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Brief description of the festival..."
                                    />
                                </div>
                            </div>

                            {/* Performances */}
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Performances</h2>

                                {!isEditingPerformance ? (
                                    <div>
                                        <ul className="space-y-3">
                                            {performances.map(p => (
                                                <li key={p.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold">{p.artist.name}</p>
                                                        <p className="text-sm text-gray-600">
                                                            {new Date(p.startTime).toLocaleString()} - {new Date(p.endTime).toLocaleString()} on {p.stage}
                                                        </p>
                                                    </div>
                                                    <div className="space-x-2">
                                                        <button type="button" onClick={() => handleEditPerformance(p)} className="text-blue-600 hover:text-blue-800 font-medium">
                                                            Edit
                                                        </button>
                                                        <button type="button" onClick={() => handleDeletePerformance(p.id)} className="text-red-600 hover:text-red-800 font-medium">
                                                            Delete
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        <button type="button" onClick={handleAddNewPerformance} className="mt-4 bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200">
                                            + Add Performance
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="text-md font-medium text-gray-800 mb-4">{editingPerformanceId ? 'Edit Performance' : 'Add New Performance'}</h3>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={performanceFormData.isNewArtist}
                                                        onChange={e => handlePerformanceInputChange('isNewArtist', e.target.checked)}
                                                        className="mr-2"
                                                    />
                                                    Create new artist
                                                </label>
                                            </div>
                                        </div>

                                        {performanceFormData.isNewArtist ? (
                                            <div className="mt-4">
                                                <label htmlFor="newArtistName" className="block text-sm font-medium text-gray-700">
                                                    New Artist Name *
                                                </label>
                                                <div className="flex space-x-2">
                                                    <input
                                                        type="text"
                                                        id="newArtistName"
                                                        value={performanceFormData.artistName}
                                                        onChange={e => handlePerformanceInputChange('artistName', e.target.value)}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="mt-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                                        disabled={isSpotifySearching || !performanceFormData.artistName}
                                                        onClick={() => searchSpotifyArtist(performanceFormData.artistName)}
                                                    >
                                                        {isSpotifySearching ? 'Searching...' : 'Spotify Lookup'}
                                                    </button>
                                                </div>
                                                {spotifySearchError && <div className="text-red-600 text-xs mt-1">{spotifySearchError}</div>}
                                                {spotifySearchResults.length > 0 && (
                                                    <div className="mt-2 bg-white border rounded shadow p-2 max-h-48 overflow-y-auto">
                                                        <div className="text-xs text-gray-500 mb-1">Select from Spotify results:</div>
                                                        <ul>
                                                            {spotifySearchResults.map((artist: SpotifySearchResult) => (
                                                                <li key={artist.id} className="py-1 flex items-center border-b last:border-b-0">
                                                                    {artist.images && artist.images[0] && <Image src={artist.images[0].url} alt={artist.name} className="w-8 h-8 rounded mr-2" />}
                                                                    <button type="button" className="text-left flex-1 hover:underline" onClick={() => handleSelectSpotifyArtist(artist)}>
                                                                        <span className="font-medium">{artist.name}</span>
                                                                        {artist.genres && artist.genres.length > 0 && <span className="ml-2 text-xs text-gray-500">({artist.genres.join(', ')})</span>}
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="mt-4">
                                                <label htmlFor="artistId" className="block text-sm font-medium text-gray-700">
                                                    Artist *
                                                </label>
                                                <select
                                                    id="artistId"
                                                    value={performanceFormData.artistId}
                                                    onChange={e => handlePerformanceInputChange('artistId', e.target.value)}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                                >
                                                    <option value="">Select an artist</option>
                                                    {availableArtists.map(artist => (
                                                        <option key={artist.id} value={artist.id}>
                                                            {artist.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor="perfStartDate" className="block text-sm font-medium text-gray-700">
                                                    Start Date *
                                                </label>
                                                <input
                                                    type="date"
                                                    id="perfStartDate"
                                                    value={performanceFormData.startDate}
                                                    onChange={e => handlePerformanceInputChange('startDate', e.target.value)}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="perfStartTime" className="block text-sm font-medium text-gray-700">
                                                    Start Time *
                                                </label>
                                                <input
                                                    type="time"
                                                    id="perfStartTime"
                                                    value={performanceFormData.startTime}
                                                    onChange={e => handlePerformanceInputChange('startTime', e.target.value)}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor="perfEndDate" className="block text-sm font-medium text-gray-700">
                                                    End Date *
                                                </label>
                                                <input
                                                    type="date"
                                                    id="perfEndDate"
                                                    value={performanceFormData.endDate}
                                                    onChange={e => handlePerformanceInputChange('endDate', e.target.value)}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="perfEndTime" className="block text-sm font-medium text-gray-700">
                                                    End Time *
                                                </label>
                                                <input
                                                    type="time"
                                                    id="perfEndTime"
                                                    value={performanceFormData.endTime}
                                                    onChange={e => handlePerformanceInputChange('endTime', e.target.value)}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <label htmlFor="stage" className="block text-sm font-medium text-gray-700">
                                                Stage *
                                            </label>
                                            <input
                                                type="text"
                                                id="stage"
                                                value={performanceFormData.stage}
                                                onChange={e => handlePerformanceInputChange('stage', e.target.value)}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                            />
                                        </div>

                                        {/* Spotify Artist Search */}
                                        {!performanceFormData.isNewArtist && (
                                            <div className="mt-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Search for Artist on Spotify</label>
                                                <div className="flex space-x-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Artist name..."
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                                                                searchSpotifyArtist((e.target as HTMLInputElement).value);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const input = document.querySelector('input[placeholder="Artist name..."]') as HTMLInputElement;
                                                            if (input.value) {
                                                                searchSpotifyArtist(input.value);
                                                            }
                                                        }}
                                                        className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700"
                                                    >
                                                        {isSpotifySearching ? 'Searching...' : 'Search'}
                                                    </button>
                                                </div>

                                                {/* Search Results */}
                                                {spotifySearchResults.length > 0 && (
                                                    <div className="mt-2 bg-white border border-gray-200 rounded-md shadow-sm">
                                                        <ul className="max-h-60 overflow-y-auto">
                                                            {spotifySearchResults.map(artist => (
                                                                <li
                                                                    key={artist.id}
                                                                    className="flex justify-between items-center p-3 hover:bg-gray-100 cursor-pointer"
                                                                    onClick={() => handleSelectSpotifyArtist(artist)}
                                                                >
                                                                    <div>
                                                                        <p className="font-semibold">{artist.name}</p>
                                                                        {artist.genres && <p className="text-sm text-gray-600">{artist.genres.join(', ')}</p>}
                                                                    </div>
                                                                    <span className="text-gray-500 text-sm">{artist.popularity}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Error Message */}
                                                {spotifySearchError && <p className="mt-2 text-sm text-red-600">{spotifySearchError}</p>}
                                            </div>
                                        )}

                                        <div className="mt-6 flex justify-end space-x-3">
                                            <button
                                                type="button"
                                                onClick={handleCancelEditPerformance}
                                                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSavePerformance}
                                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                            >
                                                Save Performance
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                <Link
                                    href={`/admin/festivals/${id}`}
                                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </AdminLayout>
        </ProtectedRoute>
    );
}
