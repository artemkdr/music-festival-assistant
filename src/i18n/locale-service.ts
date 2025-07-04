import { defaultLocale, locales } from '@/i18n/config';
import { Locale } from 'next-intl';
import { cookies, headers } from 'next/headers';
import Negotiator from 'negotiator';

const COOKIE_NAME = 'NEXT_LOCALE';

export async function getUserLocale() {
    const requestHeaders = await headers();
    const acceptLanguage = requestHeaders.get('accept-language') || '';
    const cookieLocale = (await cookies()).get(COOKIE_NAME)?.value;
    const acceptedLanguages = new Negotiator({
        headers: { 'accept-language': acceptLanguage },
    }).languages();
    // find the first accepted language that is in the supported locales
    const acceptedLanguage = acceptedLanguages.find(lang => locales.find(x => x === lang)) as Locale | undefined;
    return cookieLocale || acceptedLanguage || defaultLocale;
}

export async function setUserLocale(locale: Locale) {
    (await cookies()).set(COOKIE_NAME, locale);
}
