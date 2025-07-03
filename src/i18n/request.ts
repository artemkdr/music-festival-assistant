import { locales } from '@/i18n/config';
import { getUserLocale } from '@/i18n/locale-service';
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
    let locale = await getUserLocale();
    if (!locales.find(l => l === locale)) {
        locale = 'en'; // Fallback to default locale if the locale is not supported
    }
    console.log(`Using locale: ${locale}`);
    let messages = {};
    try {
        messages = (await import(`../../locales/${locale}.json`)).default;
    } catch {
        messages = (await import(`../../locales/en.json`)).default;
    }
    return {
        locale,
        messages,
    };
});
