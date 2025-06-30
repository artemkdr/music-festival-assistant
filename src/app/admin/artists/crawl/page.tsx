/**
 * Artists crawl page for admin
 * Allows crawling new artists by name or from festival lineup
 */
'use client';

import { artistsApi } from '@/app/lib/api';
import { AdminLayout } from '@/components/admin/admin-layout';
import { ProtectedRoute } from '@/components/protected-route';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useState } from 'react';

interface CrawlResult {
    name: string;
    status: 'crawled' | 'exists' | 'error';
    error?: string;
}

interface CrawlResponse {
    results: CrawlResult[];
}

export default function ArtistsCrawlPage() {
    const [crawlMode, setCrawlMode] = useState<'names' | 'festival'>('names');
    const [artistNames, setArtistNames] = useState('');
    const [festivalId, setFestivalId] = useState(useSearchParams().get('festivalId') || '');
    const [forceRecrawl, setForceRecrawl] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<CrawlResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (crawlMode === 'names' && !artistNames.trim()) return;
        if (crawlMode === 'festival' && !festivalId.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);

        try {
            const data =
                crawlMode === 'names'
                    ? {
                          artistNames: artistNames
                              .split('\n')
                              .map(name => name.trim())
                              .filter(name => name.length > 0),
                          force: forceRecrawl,
                      }
                    : {
                          festivalId: festivalId.trim(),
                          force: forceRecrawl,
                      };

            const response = await artistsApi.crawlArtists(data);

            if (response.status === 'success') {
                const crawlData = response.data as CrawlResponse;
                setResults(crawlData.results || []);
            } else {
                setError(response.message || 'Crawl failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setArtistNames('');
        setFestivalId('');
        setForceRecrawl(false);
        setResults([]);
        setError(null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'crawled':
                return 'text-green-600 bg-green-50';
            case 'exists':
                return 'text-blue-600 bg-blue-50';
            case 'error':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'crawled':
                return '✅';
            case 'exists':
                return 'ℹ️';
            case 'error':
                return '❌';
            default:
                return '❓';
        }
    };

    return (
        <ProtectedRoute requireAdmin>
            <AdminLayout>
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Crawl Artists</h1>
                        <p className="mt-2 text-gray-600">Add new artists by crawling data from Spotify. You can add individual artists by name or crawl all artists from a festival lineup.</p>
                    </div>

                    {/* Mode Selection */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Crawl Method</h3>
                                    <p className="text-sm text-gray-500">Choose how you want to add artists</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="crawlMode"
                                            value="names"
                                            checked={crawlMode === 'names'}
                                            onChange={e => setCrawlMode(e.target.value as 'names' | 'festival')}
                                            className="h-4 w-4 "
                                        />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">🎤 Crawl by Artist Names</div>
                                            <div className="text-sm text-gray-500">Enter a list of artist names to crawl from Spotify</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="crawlMode"
                                            value="festival"
                                            checked={crawlMode === 'festival'}
                                            onChange={e => setCrawlMode(e.target.value as 'names' | 'festival')}
                                            className="h-4 w-4 "
                                        />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">🎪 Crawl from Festival Lineup</div>
                                            <div className="text-sm text-gray-500">Crawl all artists from an existing festival&apos;s lineup</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {crawlMode === 'names' && (
                                    <div>
                                        <label htmlFor="artistNames">Artist Names (one per line)</label>
                                        <div className="mt-1">
                                            <textarea
                                                name="artistNames"
                                                id="artistNames"
                                                rows={8}
                                                required
                                                value={artistNames}
                                                onChange={e => setArtistNames(e.target.value)}
                                                placeholder="Arctic Monkeys&#10;Tame Impala&#10;Glass Animals&#10;..."
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500">Enter each artist name on a new line. We&apos;ll search for them on Spotify and fetch their data.</p>
                                    </div>
                                )}

                                {crawlMode === 'festival' && (
                                    <div>
                                        <label htmlFor="festivalId">Festival ID</label>
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                name="festivalId"
                                                id="festivalId"
                                                required
                                                value={festivalId}
                                                onChange={e => setFestivalId(e.target.value)}
                                                placeholder="festival-id"
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500">Enter the ID of an existing festival. We&apos;ll crawl all artists from its lineup.</p>
                                    </div>
                                )}

                                <div className="flex items-center">
                                    <input id="forceRecrawl" name="forceRecrawl" type="checkbox" checked={forceRecrawl} onChange={e => setForceRecrawl(e.target.checked)} />
                                    <label htmlFor="forceRecrawl" className="ml-2">
                                        Force re-crawl existing artists
                                    </label>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button type="button" onClick={handleReset} className="btn-neutral" disabled={isLoading}>
                                        Reset
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || (crawlMode === 'names' && !artistNames.trim()) || (crawlMode === 'festival' && !festivalId.trim())}
                                        className="btn-primary"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                                                Crawling...
                                            </>
                                        ) : (
                                            '🎤 Crawl Artists'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <span className="text-red-400">⚠️</span>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">Crawl Failed</h3>
                                    <p className="mt-1 text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results Display */}
                    {results.length > 0 && (
                        <div className="bg-white shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Crawl Results</h3>

                                {/* Summary */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="text-center p-3 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{results.filter(r => r.status === 'crawled').length}</div>
                                        <div className="text-sm text-green-600">Crawled</div>
                                    </div>
                                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">{results.filter(r => r.status === 'exists').length}</div>
                                        <div className="text-sm text-blue-600">Already Exist</div>
                                    </div>
                                    <div className="text-center p-3 bg-red-50 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600">{results.filter(r => r.status === 'error').length}</div>
                                        <div className="text-sm text-red-600">Errors</div>
                                    </div>
                                </div>

                                {/* Detailed Results */}
                                <div className="space-y-2">
                                    {results.map((result, index) => (
                                        <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${getStatusColor(result.status)}`}>
                                            <div className="flex items-center space-x-3">
                                                <span className="text-lg">{getStatusIcon(result.status)}</span>
                                                <span className="font-medium">{result.name}</span>
                                            </div>
                                            <div className="text-sm">
                                                {result.status === 'error' && result.error ? <span className="text-red-600">{result.error}</span> : <span className="capitalize">{result.status}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex space-x-3">
                                    <Link href="/admin/artists" className="btn-primary">
                                        View All Artists
                                    </Link>
                                    <button onClick={handleReset} className="btn-neutral">
                                        Crawl More Artists
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <span className="text-blue-400">ℹ️</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">How it works</h3>
                                <div className="mt-2 text-sm text-blue-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Enter artist names or select a festival to crawl from</li>
                                        <li>We search for each artist on Spotify</li>
                                        <li>Artist data including genres, popularity, and bio is fetched</li>
                                        <li>Artists are saved to your database for use in recommendations</li>
                                        <li>Existing artists are skipped unless force re-crawl is enabled</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        </ProtectedRoute>
    );
}
