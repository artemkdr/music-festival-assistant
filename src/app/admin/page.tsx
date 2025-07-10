/**
 * Main admin dashboard page
 * Provides overview and quick access to admin functions
 */
'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { statsApi } from '@/app/lib/api/stats-api';
import { useEffect, useState } from 'react';
import { FaSpotify, FaEdit } from 'react-icons/fa';
import { MdFestival } from 'react-icons/md';
import { GiLoveSong } from 'react-icons/gi';
import { TbMoodSing } from 'react-icons/tb';

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        festivals: 0,
        artists: 0,
        acts: 0,
        activeSessions: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await statsApi.getAdminStats();

                if (response.status !== 'success' || !response.data) {
                    throw new Error(response.message || 'Failed to fetch statistics');
                }

                setStats(response.data as typeof stats);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load statistics');
            } finally {
                setIsLoading(false);
            }
        };
        loadStats();
    }, []);

    const quickActions = [
        {
            title: 'Crawl Festival',
            description: 'Add a new festival by URL',
            icon: <MdFestival />,
            href: '/admin/festivals/crawl',
            color: 'bg-blue-500 hover:bg-blue-600',
        },
        {
            title: 'Add Artists',
            description: 'Crawl artist data from Spotify',
            icon: <FaSpotify />,
            href: '/admin/artists/crawl',
            color: 'bg-green-500 hover:bg-green-600',
        },
        {
            title: 'Manage Festivals',
            description: 'View and edit festival data',
            icon: <FaEdit />,
            href: '/admin/festivals',
            color: 'bg-purple-500 hover:bg-purple-600',
        },
        {
            title: 'Manage Artists',
            description: 'View and edit artist data',
            icon: <TbMoodSing />,
            href: '/admin/artists',
            color: 'bg-indigo-500 hover:bg-indigo-600',
        },
    ];

    const statsDisplay = [
        { name: 'Festivals', value: stats.festivals.toString(), icon: <MdFestival />, color: 'text-blue-600' },
        { name: 'Artists', value: stats.artists.toString(), icon: <TbMoodSing />, color: 'text-green-600' },
        { name: 'Live acts', value: stats.acts.toString(), icon: <GiLoveSong />, color: 'text-purple-600' },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-2 text-gray-600">Welcome back, {user?.name}! Manage festivals and artists from here.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {isLoading ? (
                    // Loading skeleton
                    Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="w-20 h-4 bg-gray-200 rounded animate-pulse mb-2"></dt>
                                            <dd className="w-12 h-6 bg-gray-200 rounded animate-pulse"></dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : error ? (
                    // Error state
                    <div className="col-span-full bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <span className="text-red-400">⚠️</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Failed to load statistics</h3>
                                <p className="mt-1 text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Actual stats
                    statsDisplay.map(stat => (
                        <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <span className="text-2xl">{stat.icon}</span>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                                            <dd className={`text-lg font-medium ${stat.color}`}>{stat.value}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {quickActions.map(action => (
                        <a key={action.title} href={action.href} className={`${action.color} text-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 block`}>
                            <div className="flex items-center">
                                <span className="text-2xl mr-3">{action.icon}</span>
                                <div>
                                    <h3 className="text-lg font-medium">{action.title}</h3>
                                    <p className="text-sm text-white/80 mt-1">{action.description}</p>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
