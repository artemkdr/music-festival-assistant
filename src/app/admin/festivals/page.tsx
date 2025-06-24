/**
 * Festivals management page for admin
 * Lists all festivals with options to view, edit, and crawl new ones
 */
'use client';

import { AdminLayout } from '@/app/components/admin/admin-layout';
import { ProtectedRoute } from '@/app/components/protected-route';
import { festivalsApi } from '@/app/lib/api';
import type { Festival } from '@/app/lib/api/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function FestivalsPage() {
    const [festivals, setFestivals] = useState<Festival[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load festivals on component mount
    useEffect(() => {
        loadFestivals();
    }, []);

    const loadFestivals = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await festivalsApi.getFestivals();

            if (response.status === 'success') {
                setFestivals(response.data as Festival[]);
            } else {
                setError(response.message || 'Failed to load festivals');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load festivals');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <ProtectedRoute requireAdmin>
            <AdminLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Festivals</h1>
                            <p className="mt-2 text-gray-600">Manage festival data and crawl new festivals</p>
                        </div>
                        <div className="flex space-x-3">
                            <Link href="/admin/festivals/crawl" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                                🎪 Crawl New Festival
                            </Link>
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

                    {/* Festivals Grid */}
                    {!isLoading && !error && (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {festivals.map(festival => (
                                <div key={festival.id} className="bg-white overflow-hidden shadow rounded-lg">
                                    <div className="px-4 py-5 sm:p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-medium text-gray-900 truncate">{festival.name}</h3>
                                            <span className="text-2xl">🎪</span>
                                        </div>

                                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                                            <div className="flex items-center">
                                                <span className="mr-2">📍</span>
                                                {festival.location}
                                            </div>
                                            <div className="flex items-center">
                                                <span className="mr-2">📅</span>
                                                {formatDate(festival.startDate)} - {formatDate(festival.endDate)}
                                            </div>
                                            <div className="flex items-center">
                                                <span className="mr-2">🎤</span>
                                                {festival.performances.length} artists
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <a
                                                href={`/admin/festivals/${festival.id}`}
                                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium text-center"
                                            >
                                                View Details
                                            </a>
                                            <a
                                                href={`/admin/festivals/${festival.id}/edit`}
                                                className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-md text-sm font-medium text-center"
                                            >
                                                Edit
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !error && festivals.length === 0 && (
                        <div className="text-center py-12">
                            <span className="text-6xl mb-4 block">🎪</span>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No festivals found</h3>
                            <p className="text-gray-600 mb-6">Get started by crawling your first festival from a website URL.</p>
                            <Link href="/admin/festivals/crawl" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                                Crawl Your First Festival
                            </Link>
                        </div>
                    )}
                </div>
            </AdminLayout>
        </ProtectedRoute>
    );
}
