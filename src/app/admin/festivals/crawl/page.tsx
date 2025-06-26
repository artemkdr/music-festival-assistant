/**
 * Festival crawl page for admin
 * Allows crawling new festivals from URLs
 */
'use client';

import { AdminLayout } from '@/app/components/admin/admin-layout';
import { ProtectedRoute } from '@/app/components/protected-route';
import { Festival, festivalsApi } from '@/app/lib/api';
import Link from 'next/link';
import { ChangeEvent, useState } from 'react';

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

// Add a type for the crawl request payload
interface CrawlFestivalRequest {
    urls: string[];
    forcedName?: string | undefined;
    files?: { name: string; type: string; base64: string }[] | undefined;
}

export default function FestivalCrawlPage() {
    const [urls, setUrls] = useState<string[]>(['']);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<CrawlResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    // New state for forced festival name
    const [forcedName, setForcedName] = useState<string>('');
    // New state for files (base64 encoded)
    const [files, setFiles] = useState<{ name: string; type: string; base64: string }[]>([]);

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

    // File input handler
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList) return;
        const fileArr = Array.from(fileList);
        const base64Files = await Promise.all(
            fileArr.map(
                file =>
                    new Promise<{ name: string; type: string; base64: string }>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = reader.result as string | undefined;
                            // add base64 data prefix
                            const base64 = `data:${file.type};base64,${result?.split(',')[1]}`;
                            resolve({
                                name: file.name,
                                type: file.type,
                                base64,
                            });
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    })
            )
        );
        setFiles(base64Files);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validUrls = urls.filter(url => url.trim());
        if (validUrls.length === 0) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            // Use the new type for clarity
            const payload: CrawlFestivalRequest = {
                urls: validUrls,
                forcedName: forcedName.trim(),
                files,
            };
            const response = await festivalsApi.crawlFestival<{ festival: Festival }>(payload);
            if (response.status === 'success' && response.data) {
                setResult({
                    success: true,
                    message: response.message,
                    festival: {
                        name: response.data.festival.name,
                        location: response.data.festival.location,
                        performances:
                            response.data.festival.lineup?.flatMap(days =>
                                days.list.map(item => ({
                                    artist: { name: item.artistName },
                                }))
                            ) || [],
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
        setForcedName('');
        setFiles([]);
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
                                    <label>
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
                                                        placeholder={`https://festival-${index + 1}.com`}
                                                        disabled={isLoading}
                                                    />
                                                </div>

                                                <div className="flex space-x-2">
                                                    {urls.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveUrl(index)}
                                                            className="inline-flex items-center btn-destructive-light border-1 border-destructive"
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
                                                            className="inline-flex items-center btn-primary-light border-1 border-primary"
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

                                {/* File Upload Input */}
                                <div>
                                    <label htmlFor="fileUpload">Attach Files (PDF or Images, optional)</label>
                                    <input id="fileUpload" type="file" accept=".pdf,image/*" multiple className="mt-1" onChange={handleFileChange} disabled={isLoading} />
                                    {files.length > 0 && (
                                        <ul className="mt-2 text-xs text-gray-600 list-disc ml-5">
                                            {files.map(f => (
                                                <li key={f.name}>
                                                    {f.name} ({f.type})
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <p className="mt-2 text-sm text-gray-500">You can attach PDF or image files to help the AI extract lineup/schedule data.</p>
                                </div>

                                {/* Forced Festival Name Input */}
                                <div>
                                    <label htmlFor="forcedName">Forced Festival Name (optional)</label>
                                    <input
                                        id="forcedName"
                                        type="text"
                                        className="mt-1 w-full"
                                        placeholder="Override detected festival name"
                                        value={forcedName}
                                        onChange={e => setForcedName(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <p className="mt-2 text-sm text-gray-500">If provided, this name will override the name detected from the website(s).</p>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button type="button" onClick={handleReset} className="btn-neutral" disabled={isLoading}>
                                        Reset
                                    </button>
                                    <button type="submit" disabled={isLoading || urls.filter(u => u.trim()).length === 0} className="btn-primary">
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
                                                <Link href="/admin/festivals" className="btn-primary-light">
                                                    View All Festivals
                                                </Link>
                                                <button onClick={handleReset} className="btn-primary">
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
                    <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <span className="text-primary">ℹ️</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-primary">How it works</h3>
                                <div className="mt-2 text-sm text-primary">
                                    <ol className="list-decimal list-inside space-y-1">
                                        <li>Enter one or more festival website URLs (up to 10)</li>
                                        <li>Our AI crawls and analyzes each website content</li>
                                        <li>Festival lineup and schedule data is extracted and merged</li>
                                        <li>The festival(s) are added to your database</li>
                                        <li>You can then crawl artist data separately</li>
                                    </ol>
                                    <div className="mt-3 p-2 bg-primary/15 rounded text-xs">
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
