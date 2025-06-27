import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/contexts/auth-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Music Festival Assistant',
    description: 'Discover artists at music festivals based on your preferences',
    keywords: ['music', 'festival', 'discovery', 'recommendations', 'artists'],
    authors: [{ name: 'Music Festival Assistant Team' }],
    viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
    return (
        <html lang="en" className="h-full">
            <body className={`${inter.className} h-full antialiased`}>
                <AuthProvider>
                    <div className="min-h-full bg-gradient-to-br from-purple-50 to-blue-50">
                        <header className="bg-white shadow-sm border-b">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="flex justify-between items-center py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                                            <span className="text-white font-bold text-sm">🎵</span>
                                        </div>
                                        <h1 className="text-xl font-bold text-gray-900">Festival Assistant</h1>
                                    </div>
                                    <nav className="hidden md:flex space-x-6">
                                        <a href="#discover" className="text-gray-600 hover:text-gray-900 transition-colors">
                                            Discover
                                        </a>
                                        <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">
                                            About
                                        </a>
                                        <a href="/admin/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                                            Admin
                                        </a>
                                    </nav>
                                </div>
                            </div>
                        </header>

                        <main className="flex-1">{children}</main>

                        <footer className="bg-white border-t">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                                <div className="text-center text-gray-600">
                                    <p>© 2024 Music Festival Assistant. Discover your next favorite artist.</p>
                                </div>
                            </div>
                        </footer>
                    </div>
                </AuthProvider>
            </body>
        </html>
    );
}
