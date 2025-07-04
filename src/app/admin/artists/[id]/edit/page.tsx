/**
 * Artist edit page for admin
 * Allows editing of artist information, genres, and external links
 */
'use client';

import { AdminLayout } from '@/components/admin/admin-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { artistsApi } from '@/app/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, Usable } from 'react';
import { Artist } from '@/lib/schemas';

interface ArtistEditPageProps {
    params: Usable<{ id: string }>;
}

export default function ArtistEditPage({ params }: ArtistEditPageProps) {
    const artistId = React.use(params).id;
    const [artist, setArtist] = useState<Artist | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Artist>>({});
    const [showRecrawl, setShowRecrawl] = useState(false);
    const [recrawlLoading, setRecrawlLoading] = useState(false);
    const [recrawlError, setRecrawlError] = useState<string | null>(null);
    const [recrawlForm, setRecrawlForm] = useState({
        id: artistId,
        name: '',
        spotifyId: '',
        context: '',
    });
    const router = useRouter();

    useEffect(() => {
        const loadArtist = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await artistsApi.getArtist(artistId);

                if (response.status !== 'success' || !response.data) {
                    throw new Error(response.message || 'Failed to fetch artist details');
                }

                const artistData = response.data as Artist;
                setArtist(artistData);
                setFormData(artistData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load artist');
            } finally {
                setIsLoading(false);
            }
        };

        loadArtist();
    }, [artistId]);

    useEffect(() => {
        if (artist) {
            setRecrawlForm({
                id: artist.id,
                name: artist.name || '',
                spotifyId: artist.streamingLinks?.spotify?.split('/').pop() || '',
                context: '',
            });
        }
    }, [artist]);

    const handleInputChange = (field: string, value: string | number | string[]) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleNestedInputChange = (parentField: keyof Artist, childField: string, value: string) => {
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

    const handleRecrawlInput = (field: string, value: string) => {
        setRecrawlForm(prev => ({ ...prev, [field]: value }));
    };

    const handleRecrawl = async (e: React.FormEvent) => {
        e.preventDefault();
        setRecrawlLoading(true);
        setRecrawlError(null);
        try {
            const response = await artistsApi.crawlArtist({
                id: recrawlForm.id,
                name: recrawlForm.name,
                spotifyId: recrawlForm.spotifyId || undefined,
                context: recrawlForm.context || undefined,
            });
            if (response.status !== 'success' || !response.data) {
                throw new Error(response.message || 'Failed to recrawl artist');
            }
            setFormData(response.data as Artist);
            setShowRecrawl(false);
        } catch (err) {
            setRecrawlError(err instanceof Error ? err.message : 'Failed to recrawl artist');
        } finally {
            setRecrawlLoading(false);
        }
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

            const response = await artistsApi.updateArtist(artistId, cleanedFormData);

            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to update artist');
            }

            // Redirect back to artist detail page
            router.push(`/admin/artists/${artistId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save artist');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <ProtectedRoute requireAdmin>
                <AdminLayout>
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-magic"></div>
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
                        <Link href="/admin/artists" className="mt-4 link-primary">
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
                                <Link href={`/admin/artists/${artistId}`} className="link-neutral">
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
                                        <label htmlFor="name">Artist Name *</label>
                                        <input type="text" id="name" required value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} className="mt-1 block w-full" />
                                    </div>

                                    <div>
                                        <label htmlFor="imageUrl">Image URL</label>
                                        <input type="url" id="imageUrl" value={formData.imageUrl || ''} onChange={e => handleInputChange('imageUrl', e.target.value)} className="mt-1 block w-ful" />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label htmlFor="description">Description</label>
                                    <textarea
                                        id="description"
                                        rows={4}
                                        value={formData.description || ''}
                                        onChange={e => handleInputChange('description', e.target.value)}
                                        className="mt-1 block w-full"
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
                                            <input type="text" value={genre} onChange={e => handleGenreChange(index, e.target.value)} className="flex-1" placeholder="Genre name" />
                                            <button type="button" onClick={() => removeGenre(index)} className="btn-destructive-light">
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addGenre} className="btn-primary-light">
                                        + Add Genre
                                    </button>
                                </div>
                            </div>

                            {/* Streaming Links */}
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Streaming Links</h2>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="spotify">Spotify URL</label>
                                        <input
                                            type="url"
                                            id="spotify"
                                            value={formData.streamingLinks?.spotify || ''}
                                            onChange={e => handleNestedInputChange('streamingLinks', 'spotify', e.target.value)}
                                            className="mt-1 block w-full"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="appleMusic">Apple Music URL</label>
                                        <input
                                            type="url"
                                            id="appleMusic"
                                            value={formData.streamingLinks?.appleMusic || ''}
                                            onChange={e => handleNestedInputChange('streamingLinks', 'appleMusic', e.target.value)}
                                            className="mt-1 block w-full"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="youtube">YouTube URL</label>
                                        <input
                                            type="url"
                                            id="youtube"
                                            value={formData.streamingLinks?.youtube || ''}
                                            onChange={e => handleNestedInputChange('streamingLinks', 'youtube', e.target.value)}
                                            className="mt-1 block w-full"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="soundcloud">SoundCloud URL</label>
                                        <input
                                            type="url"
                                            id="soundcloud"
                                            value={formData.streamingLinks?.soundcloud || ''}
                                            onChange={e => handleNestedInputChange('streamingLinks', 'soundcloud', e.target.value)}
                                            className="mt-1 block w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Social Links */}
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Social Links</h2>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="website">Website</label>
                                        <input
                                            type="url"
                                            id="website"
                                            value={formData.socialLinks?.website || ''}
                                            onChange={e => handleNestedInputChange('socialLinks', 'website', e.target.value)}
                                            className="mt-1 block w-full"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="instagram">Instagram</label>
                                        <input
                                            type="url"
                                            id="instagram"
                                            value={formData.socialLinks?.instagram || ''}
                                            onChange={e => handleNestedInputChange('socialLinks', 'instagram', e.target.value)}
                                            className="mt-1 block w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex flex-wrap justify-end space-x-3 pt-6 border-t border-gray-200">
                                <Link href={`/admin/artists/${artistId}`} className="btn-neutral">
                                    Cancel
                                </Link>
                                <button type="button" className="btn-primary-light border-1 border-primary" onClick={() => setShowRecrawl(v => !v)}>
                                    {showRecrawl ? 'Cancel Re-crawl' : 'Re-crawl Artist'}
                                </button>
                                <button type="submit" disabled={isSaving} className="btn-primary">
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                    {showRecrawl && (
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                            <form onSubmit={handleRecrawl} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label>Artist ID</label>
                                        <input type="text" value={recrawlForm.id} disabled />
                                    </div>
                                    <div>
                                        <label>Artist Name</label>
                                        <input type="text" value={recrawlForm.name} onChange={e => handleRecrawlInput('name', e.target.value)} required />
                                    </div>
                                    <div>
                                        <label>Spotify ID</label>
                                        <input type="text" value={recrawlForm.spotifyId} onChange={e => handleRecrawlInput('spotifyId', e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Context</label>
                                        <input type="text" value={recrawlForm.context} onChange={e => handleRecrawlInput('context', e.target.value)} />
                                    </div>
                                </div>
                                {recrawlError && <div className="text-red-600 text-sm">{recrawlError}</div>}
                                <div className="flex justify-end">
                                    <button type="submit" disabled={recrawlLoading} className="btn-primary">
                                        {recrawlLoading ? 'Re-crawling...' : 'Re-crawl'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </AdminLayout>
        </ProtectedRoute>
    );
}
