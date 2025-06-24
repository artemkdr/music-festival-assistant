/**
 * Artist edit page for admin
 * Allows editing of artist information, genres, and external links
 */
'use client';

import { AdminLayout } from '@/components/admin/admin-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { ArtistDetails, artistsApi } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, Usable } from 'react';

interface ArtistEditPageProps {
    params: Usable<{ id: string }>;
}

export default function ArtistEditPage({ params }: ArtistEditPageProps) {
    const [artist, setArtist] = useState<ArtistDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ArtistDetails>>({});
    const { id } = React.use(params);
    const router = useRouter();

    useEffect(() => {
        const loadArtist = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await artistsApi.getArtist(id);

                if (response.status !== 'success' || !response.data) {
                    throw new Error(response.message || 'Failed to fetch artist details');
                }

                const artistData = response.data as ArtistDetails;
                setArtist(artistData);
                setFormData(artistData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load artist');
                console.error('Error loading artist:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadArtist();
    }, [id]);

    const handleInputChange = (field: string, value: string | number | string[]) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleNestedInputChange = (parentField: keyof ArtistDetails, childField: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [parentField]: {
                ...((prev[parentField] as Record<string, string>) || {}),
                [childField]: value || undefined,
            },
        }));
    };

    const handleGenreChange = (index: number, value: string) => {
        const newGenres = [...(formData.genre || [])];
        newGenres[index] = value;
        handleInputChange('genre', newGenres);
    };

    const addGenre = () => {
        const newGenres = [...(formData.genre || []), ''];
        handleInputChange('genre', newGenres);
    };

    const removeGenre = (index: number) => {
        const newGenres = [...(formData.genre || [])];
        newGenres.splice(index, 1);
        handleInputChange('genre', newGenres);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setIsSaving(true);
            setError(null);

            // Filter out empty genres
            const cleanedFormData = {
                ...formData,
                genre: (formData.genre || []).filter(g => g.trim() !== ''),
            };

            const response = await artistsApi.updateArtist(id, cleanedFormData);

            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to update artist');
            }

            // Redirect back to artist detail page
            router.push(`/admin/artists/${id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save artist');
            console.error('Error saving artist:', err);
        } finally {
            setIsSaving(false);
        }
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

    if (!artist) {
        return (
            <ProtectedRoute requireAdmin>
                <AdminLayout>
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold text-gray-900">Artist Not Found</h2>
                        <p className="text-gray-600 mt-2">The artist you&apos;re looking for doesn&apos;t exist.</p>
                        <Link href="/admin/artists" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md">
                            Back to Artists
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
                                <Link href={`/admin/artists/${id}`} className="text-gray-500 hover:text-gray-700">
                                    ← Back to {artist.name}
                                </Link>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900">Edit Artist</h1>
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
                                            Artist Name *
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
                                        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
                                            Image URL
                                        </label>
                                        <input
                                            type="url"
                                            id="imageUrl"
                                            value={formData.imageUrl || ''}
                                            onChange={e => handleInputChange('imageUrl', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                                        placeholder="Brief description of the artist..."
                                    />
                                </div>
                            </div>

                            {/* Genres */}
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Genres</h2>
                                <div className="space-y-2">
                                    {(formData.genre || []).map((genre, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                value={genre}
                                                onChange={e => handleGenreChange(index, e.target.value)}
                                                className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Genre name"
                                            />
                                            <button type="button" onClick={() => removeGenre(index)} className="text-red-600 hover:text-red-800">
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addGenre} className="text-blue-600 hover:text-blue-800 text-sm">
                                        + Add Genre
                                    </button>
                                </div>
                            </div>

                            {/* Streaming Links */}
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Streaming Links</h2>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="spotify" className="block text-sm font-medium text-gray-700">
                                            Spotify URL
                                        </label>
                                        <input
                                            type="url"
                                            id="spotify"
                                            value={formData.streamingLinks?.spotify || ''}
                                            onChange={e => handleNestedInputChange('streamingLinks', 'spotify', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="appleMusic" className="block text-sm font-medium text-gray-700">
                                            Apple Music URL
                                        </label>
                                        <input
                                            type="url"
                                            id="appleMusic"
                                            value={formData.streamingLinks?.appleMusic || ''}
                                            onChange={e => handleNestedInputChange('streamingLinks', 'appleMusic', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="youtube" className="block text-sm font-medium text-gray-700">
                                            YouTube URL
                                        </label>
                                        <input
                                            type="url"
                                            id="youtube"
                                            value={formData.streamingLinks?.youtube || ''}
                                            onChange={e => handleNestedInputChange('streamingLinks', 'youtube', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="soundcloud" className="block text-sm font-medium text-gray-700">
                                            SoundCloud URL
                                        </label>
                                        <input
                                            type="url"
                                            id="soundcloud"
                                            value={formData.streamingLinks?.soundcloud || ''}
                                            onChange={e => handleNestedInputChange('streamingLinks', 'soundcloud', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Social Links */}
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Social Links</h2>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                                            Website
                                        </label>
                                        <input
                                            type="url"
                                            id="website"
                                            value={formData.socialLinks?.website || ''}
                                            onChange={e => handleNestedInputChange('socialLinks', 'website', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
                                            Instagram
                                        </label>
                                        <input
                                            type="url"
                                            id="instagram"
                                            value={formData.socialLinks?.instagram || ''}
                                            onChange={e => handleNestedInputChange('socialLinks', 'instagram', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="twitter" className="block text-sm font-medium text-gray-700">
                                            Twitter
                                        </label>
                                        <input
                                            type="url"
                                            id="twitter"
                                            value={formData.socialLinks?.twitter || ''}
                                            onChange={e => handleNestedInputChange('socialLinks', 'twitter', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="facebook" className="block text-sm font-medium text-gray-700">
                                            Facebook
                                        </label>
                                        <input
                                            type="url"
                                            id="facebook"
                                            value={formData.socialLinks?.facebook || ''}
                                            onChange={e => handleNestedInputChange('socialLinks', 'facebook', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                <Link
                                    href={`/admin/artists/${id}`}
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
