import { Logo } from '@/components/logo';
import { SupportMeButton } from '@/components/support-me-button';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { LanguageSelector } from '@/components/language-selector';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Swiss Music Festival Assistant',
    description: 'Discover artists at music festivals based on your preferences',
    keywords: ['music', 'festival', 'discovery', 'recommendations', 'artists'],
    authors: [{ name: 'Artem Kudryavtsev' }],
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
    const t = await getTranslations();
    const locale = await getLocale();

    return (
        <html lang={locale} className="h-full">
            <body className={`${inter.className} h-full antialiased`}>
                <NextIntlClientProvider>
                    <Analytics />
                    <AuthProvider>
                        <div className="min-h-full bg-gradient-to-br from-purple-50 to-blue-50">
                            <header className="bg-white shadow-sm border-b">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <div className="flex justify-between items-center py-4">
                                        <Link href="/" className="flex items-center space-x-3 text-magic">
                                            <Logo size={20} />
                                            <h1 className="text-xl font-bold text-gray-900">{t('Common.Title')}</h1>
                                        </Link>
                                        <div className="flex items-center">
                                            <LanguageSelector currentLocale={locale} />
                                        </div>
                                    </div>
                                </div>
                            </header>

                            <main className="flex-1">
                                <Suspense>{children}</Suspense>
                            </main>

                            <footer className="bg-white border-t">
                                {/* Support me */}
                                <div className="flex justify-center mt-4 px-2">
                                    <SupportMeButton />
                                </div>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4">
                                    <div className="text-center">
                                        <Link href="/about" className="link-neutral underline font-bold">
                                            {t('Layout.AboutLink')}
                                        </Link>
                                    </div>
                                    <div className="text-center text-gray-600">
                                        <p>{t('Layout.Copyright')}</p>
                                    </div>
                                    {/* About public information used on the site */}
                                    <div className="text-center text-foreground/70 text-xs flex flex-col gap-1">
                                        {(t.raw('Layout.DataDisclaimer') as string[])?.map((line, index) => (
                                            <p key={index}>{line}</p>
                                        ))}
                                    </div>
                                </div>
                            </footer>
                        </div>
                    </AuthProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
