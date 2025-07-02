import { Logo } from '@/components/logo';
import { AuthProvider } from '@/lib/contexts/auth-context';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense, type ReactNode } from 'react';
import './globals.css';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Music Festival Assistant',
    description: 'Discover artists at music festivals based on your preferences',
    keywords: ['music', 'festival', 'discovery', 'recommendations', 'artists'],
    authors: [{ name: 'Music Festival Assistant Team' }],
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
    return (
        <html lang="en" className="h-full">
            <body className={`${inter.className} h-full antialiased`}>
                <Analytics />
                <AuthProvider>
                    <div className="min-h-full bg-gradient-to-br from-purple-50 to-blue-50">
                        <header className="bg-white shadow-sm border-b">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="flex justify-between items-center py-4">
                                    <Link href="/" className="flex items-center space-x-3 text-magic">
                                        <Logo size={20} />
                                        <h1 className="text-xl font-bold text-gray-900">Swiss Festival Assistant</h1>
                                    </Link>
                                    {/*<nav className="hidden md:flex space-x-6">
                                        <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                                            Discover
                                        </Link>
                                        <Link href="/admin/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                                            Admin
                                        </Link>
                                    </nav>*/}
                                </div>
                            </div>
                        </header>

                        <main className="flex-1">
                            <Suspense>{children}</Suspense>
                        </main>

                        <footer className="bg-white border-t">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-2">
                                <div className="text-center text-gray-600">
                                    <p>© 2025 Music Festival Assistant. Discover your next favorite artist.</p>
                                </div>
                                {/* About public information used on the site */}
                                <div className="text-center text-foreground/70 text-xs">
                                    <p>
                                        This site uses public data from festival websites, Spotify and AI generated information. Please verify artist details on official festival pages or streaming
                                        platforms. We do not guarantee the accuracy of artist information. We do not store any personal data.
                                    </p>
                                </div>
                            </div>
                        </footer>
                    </div>
                </AuthProvider>
            </body>
        </html>
    );
}
