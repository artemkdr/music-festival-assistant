/**
 * Festival crawl page for admin
 * Allows crawling new festivals from URLs
 */
'use client';

import { AdminLayout } from '@/app/components/admin/admin-layout';
import { ProtectedRoute } from '@/app/components/protected-route';
import { Festival, festivalsApi } from '@/app/lib/api';
import Link from 'next/link';
import { useState } from 'react';

interface CrawlResult {
    success: boolean;
    message: string;
    festival?: {
        name: string;
        location: string;
        performances: Array<{ artist: { name: string } }>;
    };
    error?: string;
}

export default function FestivalCrawlPage() {
    const [urls, setUrls] = useState<string[]>(['']);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<CrawlResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAddUrl = () => {
        if (urls.length < 10) {
            setUrls([...urls, '']);
        }
    };

    const handleRemoveUrl = (index: number) => {
        if (urls.length > 1) {
            setUrls(urls.filter((_, i) => i !== index));
        }
    };

    const handleUrlChange = (index: number, value: string) => {
        const newUrls = [...urls];
        newUrls[index] = value;
        setUrls(newUrls);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validUrls = urls.filter(url => url.trim());
        if (validUrls.length === 0) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await festivalsApi.crawlFestival<{
                festival: Festival;
            }>({ urls: validUrls });
            if (response.status === 'success' && response.data) {
                setResult({
                    success: true,
                    message: response.message,
                    festival: {
                        name: response.data.festival.name,
                        location: response.data.festival.location,
                        performances: response.data.festival.performances.map(perf => ({
                            artist: { name: perf.artist.name },
                        })),
                    },
                });
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
        setUrls(['']);
        setResult(null);
        setError(null);
    };

    return (
        <ProtectedRoute requireAdmin>
            <AdminLayout>
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Crawl Festival</h1>
                        <p className="mt-2 text-gray-600">Add a new festival by providing its website URL. Our AI will parse the lineup and schedule.</p>
                    </div>

                    {/* Form */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        Festival Website URLs ({urls.length}/{10})
                                    </label>

                                    <div className="space-y-3">
                                        {urls.map((url, index) => (
                                            <div key={index} className="flex items-center space-x-3">
                                                <div className="flex-1">
                                                    <input
                                                        type="url"
                                                        required={index === 0}
                                                        value={url}
                                                        onChange={e => handleUrlChange(index, e.target.value)}
                                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                        placeholder={`https://festival-${index + 1}.com`}
                                                        disabled={isLoading}
                                                    />
                                                </div>

                                                <div className="flex space-x-2">
                                                    {urls.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveUrl(index)}
                                                            className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-400 hover:text-red-500 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                            disabled={isLoading}
                                                            title="Remove URL"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {index === urls.length - 1 && urls.length < 10 && (
                                                        <button
                                                            type="button"
                                                            onClick={handleAddUrl}
                                                            className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-400 hover:text-blue-500 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                            disabled={isLoading}
                                                            title="Add another URL"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="mt-2 text-sm text-gray-500">
                                        Add up to 10 festival website URLs. You can crawl multiple festivals at once or provide multiple sources for better data accuracy.
                                    </p>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        disabled={isLoading}
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || urls.filter(u => u.trim()).length === 0}
                                        className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                                                Crawling...
                                            </>
                                        ) : (
                                            `🎪 Crawl Festival${urls.filter(u => u.trim()).length > 1 ? 's' : ''}`
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

                    {/* Success Result */}
                    {result && result.success && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <span className="text-green-400">✅</span>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-green-800">Festival Crawled Successfully!</h3>
                                    <p className="mt-1 text-sm text-green-700">{result.message}</p>

                                    {result.festival && (
                                        <div className="mt-4 p-4 bg-white rounded border border-green-200">
                                            <h4 className="font-medium text-gray-900 mb-3">Festival Details:</h4>
                                            <div className="space-y-2 text-sm">
                                                <p>
                                                    <strong>Name:</strong> {result.festival.name}
                                                </p>
                                                <p>
                                                    <strong>Location:</strong> {result.festival.location}
                                                </p>
                                                <p>
                                                    <strong>Artists Found:</strong> {result.festival.performances?.length || 0}
                                                </p>
                                                {result.festival.performances && result.festival.performances.length > 0 && (
                                                    <div>
                                                        <strong>Sample Artists:</strong>
                                                        <ul className="mt-1 ml-4 list-disc">
                                                            {result.festival.performances.slice(0, 5).map((perf, index) => (
                                                                <li key={index}>{perf.artist.name}</li>
                                                            ))}
                                                            {result.festival.performances.length > 5 && <li>... and {result.festival.performances.length - 5} more</li>}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4 flex space-x-3">
                                                <Link href="/admin/festivals" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                                                    View All Festivals
                                                </Link>
                                                <button onClick={handleReset} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                                                    Crawl Another
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                                    <ol className="list-decimal list-inside space-y-1">
                                        <li>Enter one or more festival website URLs (up to 10)</li>
                                        <li>Our AI crawls and analyzes each website content</li>
                                        <li>Festival lineup and schedule data is extracted and merged</li>
                                        <li>The festival(s) are added to your database</li>
                                        <li>You can then crawl artist data separately</li>
                                    </ol>
                                    <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
                                        <strong>Pro tip:</strong> Use multiple URLs to get more complete data - different sources might have different details about the same festival!
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        </ProtectedRoute>
    );
}
