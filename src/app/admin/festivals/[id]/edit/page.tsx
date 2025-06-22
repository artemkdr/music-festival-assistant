/**
 * Festival edit page for admin
 * Allows editing of festival information, dates, and description
 */
'use client';

import { AdminLayout } from '@/components/admin/admin-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

interface Festival {
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
    website?: string;
    description?: string;
    imageUrl?: string;
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

interface FestivalFormData {
    name?: string;
    location?: string;
    startDate?: string | undefined; // Date string in YYYY-MM-DD format for inputs
    endDate?: string | undefined; // Date string in YYYY-MM-DD format for inputs
    website?: string | undefined;
    description?: string | undefined;
    imageUrl?: string | undefined;
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
    const router = useRouter();

    useEffect(() => {
        const loadFestival = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const resolvedParams = await params;
                setId(resolvedParams.id);

                const response = await apiClient.getFestival(resolvedParams.id);

                if (response.status !== 'success' || !response.data) {
                    throw new Error(response.message || 'Failed to fetch festival details');
                }
                const festivalData = response.data as Festival;
                setFestival(festivalData);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setIsSaving(true);
            setError(null);

            // Convert dates back to ISO format
            const cleanedFormData = {
                ...formData,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
            };

            const response = await apiClient.updateFestival(id, cleanedFormData);

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

                            {/* Performance Summary */}
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Summary</h2>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">{festival.performances.length}</div>
                                            <div className="text-sm text-gray-600">Total Performances</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">{new Set(festival.performances.map(p => p.artist.id)).size}</div>
                                            <div className="text-sm text-gray-600">Unique Artists</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600">{new Set(festival.performances.map(p => p.stage)).size}</div>
                                            <div className="text-sm text-gray-600">Stages</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-sm text-gray-600">
                                        <p>To modify performances, use the artist crawl feature or manage artists individually.</p>
                                    </div>
                                </div>
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
