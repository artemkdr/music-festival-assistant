/**
 * Admin layout component
 * Provides shared layout for all admin pages with navigation and user info
 */
'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { MdFestival } from 'react-icons/md';
import { TbDashboard, TbMoodSing } from 'react-icons/tb';

interface AdminLayoutProps {
    children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const navigation = [
        { name: 'Dashboard', href: '/admin', icon: <TbDashboard /> },
        { name: 'Festivals', href: '/admin/festivals', icon: <MdFestival /> },
        { name: 'Artists', href: '/admin/artists', icon: <TbMoodSing /> },
    ];

    const isActive = (href: string) => {
        if (href === '/admin') {
            return pathname === '/admin';
        }
        return pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen">
            {/* Navigation Header */}
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        {/* Logo and Navigation */}
                        <div className="flex">
                            {' '}
                            <div className="flex-shrink-0 flex items-center">
                                <a href="/admin" className="flex items-center space-x-3">
                                    <span className="text-xl font-bold text-gray-900">Admin Panel</span>
                                </a>
                            </div>
                            {/* Navigation Links */}
                            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                                {' '}
                                {navigation.map(item => (
                                    <a
                                        key={item.name}
                                        href={item.href}
                                        className={`${
                                            isActive(item.href) ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                    >
                                        <span className="mr-2">{item.icon}</span>
                                        {item.name}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="hidden sm:ml-6 sm:flex sm:items-center">
                            <div className="flex items-center space-x-4">
                                <div className="text-sm text-gray-700">
                                    <span className="font-medium">{user?.name}</span>
                                    <span className="text-gray-500 ml-1">({user?.role})</span>
                                </div>
                                <button onClick={logout} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm font-medium transition-colors">
                                    Logout
                                </button>
                            </div>
                        </div>

                        {/* Mobile menu button */}
                        <div className="sm:hidden flex items-center">
                            <button
                                type="button"
                                className="text-gray-500 hover:text-gray-700 p-2"
                                onClick={() => {
                                    // Toggle mobile menu - simplified for now
                                }}
                            >
                                <span className="sr-only">Open main menu</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        </div>
    );
}
