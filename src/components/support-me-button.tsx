import { TwintLogo } from '@/components/twint-logo';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface SupportMeButtonProps {
    title?: string;
    variant?: 'button' | 'link';
}

export const SupportMeButton = ({ title, variant }: SupportMeButtonProps) => {
    const t = useTranslations('SupportMe');
    const buttonClass = 'px-4 py-2 bg-black text-white text-sm flex item-center gap-2 rounded-md max-w-80 md:max-w-70 shadow-md';
    const linkClass = 'text-black hover:text-gray-700 transition-colors flex item-center gap-2 underline max-w-80';
    const variantClass = variant === 'link' ? linkClass : buttonClass;
    return (
        <Link
            href="https://go.twint.ch/1/e/tw?tw=acq.nMhMSb0GTNG0BNqk9Z2VYou8xFkUC9lCcB5aClwy68-wY4qb8HHZKxVrhQckQOJ1."
            title={t('LinkTitle')}
            target="_blank"
            rel="noopener noreferrer"
            className={variantClass}
        >
            <span>{title ?? t('DefaultTitle')}</span>
            <TwintLogo size={60} variant={variant === 'link' ? 'white' : 'black'} />
        </Link>
    );
};
