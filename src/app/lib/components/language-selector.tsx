'use client';
import { localeApi } from '@/app/lib/api-client/locale-api';
import { locales } from '@/i18n/config';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LanguageSelector({ currentLocale }: { currentLocale: string }) {
    const [selected, setSelected] = useState(currentLocale);
    const router = useRouter();

    async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const locale = e.target.value;
        setSelected(locale);
        // Call API route to set cookie
        try {
            await localeApi.setLocale(locale);
        } catch {
            // do nothing
        }
        // Reload page to apply new locale
        router.refresh();
    }

    return (
        <select className="ml-4 min-w-14 border border-muted/40 rounded px-2 py-1 text-sm bg-white" value={selected} onChange={handleChange} aria-label="Select language">
            {locales.map(loc => (
                <option key={loc} value={loc}>
                    {loc.toLowerCase()}
                </option>
            ))}
        </select>
    );
}
