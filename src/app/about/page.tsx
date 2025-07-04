import { useTranslations } from 'next-intl';

export default function AboutPage() {
    const t = useTranslations('AboutPage');
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('Title')}</h1>
            <p className="text-gray-700">{t('Welcome')}</p>
            <p className="text-gray-700 mt-2">{t('Mission')}</p>

            <section className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('WhyTitle')}</h2>
                <p className="text-gray-700">{t('WhyText')}</p>
            </section>

            <section className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('HowTitle')}</h2>
                <ol className="list-decimal list-inside text-gray-700 space-y-1">
                    {(t.raw('HowSteps') as string[]).map((step: string, idx: number) => (
                        <li key={idx}>{step}</li>
                    ))}
                </ol>
            </section>

            <section className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('ContactTitle')}</h2>
                <p className="text-gray-700 mb-4">
                    {t.rich('ContactText', {
                        email: chunks => (
                            <a className="link-primary underline" href="mailto:artem.kdr@gmail.com">
                                {chunks}
                            </a>
                        ),
                    })}
                </p>
            </section>

            <section className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('SupportTitle')}</h2>
                <p className="text-gray-700 mb-4">{t('SupportText')}</p>
            </section>
        </div>
    );
}
