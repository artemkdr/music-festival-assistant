/**
 * Festival crawl page for admin
 * Allows crawling new festivals from URLs
 */
'use client';

import { AdminLayout } from '@/components/admin/admin-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { apiClient } from '@/lib/api/client';
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
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<CrawlResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await apiClient.crawlFestival(url.trim());
            if (response.status === 'success') {
                setResult({
                    success: true,
                    message: response.message,
                    festival: (response.data as any)?.crawlResult?.festival,
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
        setUrl('');
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
                                    <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                                        Festival Website URL
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="url"
                                            name="url"
                                            id="url"
                                            required
                                            value={url}
                                            onChange={e => setUrl(e.target.value)}
                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            placeholder="https://example-festival.com"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500">Enter the URL of a festival website that contains lineup or artist information.</p>
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
                                        disabled={isLoading || !url.trim()}
                                        className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                                                Crawling...
                                            </>
                                        ) : (
                                            '🎪 Crawl Festival'
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
                                                <a href="/admin/festivals" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                                                    View All Festivals
                                                </a>
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
                                        <li>Enter the URL of a festival website</li>
                                        <li>Our AI crawls and analyzes the website content</li>
                                        <li>Festival lineup and schedule data is extracted</li>
                                        <li>The festival is added to your database</li>
                                        <li>You can then crawl artist data separately</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        </ProtectedRoute>
    );
}
