/**
 * Festival hero section component
 * Displays festival header, stats, and description
 */
'use client';

import { Festival } from '@/lib/schemas';
import { getFestivalArtists, groupFestivalActsByDate } from '@/lib/utils/festival-util';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';
import { GiLoveSong } from 'react-icons/gi';
import { MdCalendarToday, MdFestival, MdLanguage, MdLocationOn } from 'react-icons/md';
import { TbMoodSing } from 'react-icons/tb';

interface FestivalHeroProps {
    festival: Festival;
}

export function FestivalHero({ festival }: FestivalHeroProps): React.ReactElement {
    const t = useTranslations('FestivalPage');

    const totalArtists = getFestivalArtists(festival).length;
    const totalDays = groupFestivalActsByDate(festival).length;

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {festival.imageUrl && (
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${festival.imageUrl})` }}>
                    <div className="h-full bg-gradient-to-t from-black/50 to-transparent flex items-end">
                        <div className="p-6 text-white">
                            <h1 className="text-3xl font-bold mb-2">{festival.name}</h1>
                            <p className="text-lg opacity-90">{festival.location}</p>
                        </div>
                    </div>
                </div>
            )}

            {!festival.imageUrl && (
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                        <MdFestival className="mr-3 text-primary" />
                        {festival.name}
                    </h1>
                    <p className="text-lg text-gray-600 flex items-center">
                        <MdLocationOn className="mr-2" />
                        {festival.location}
                    </p>
                </div>
            )}

            {/* Festival Stats */}
            <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                            <MdCalendarToday className="text-primary text-xl" />
                        </div>
                        <div className="text-sm text-gray-600">{t('FestivalSchedule')}</div>
                        <div className="font-semibold">{totalDays > 0 ? t('TotalDays', { count: totalDays }) : ''}</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                            <TbMoodSing className="text-primary text-xl" />
                        </div>
                        <div className="text-sm text-gray-600">{t('TotalArtists')}</div>
                        <div className="font-semibold">{totalArtists}</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                            <GiLoveSong className="text-primary text-xl" />
                        </div>
                        <div className="text-sm text-gray-600">{t('Performances')}</div>
                        <div className="font-semibold">{festival.lineup.length}</div>
                    </div>
                    {festival.website && (
                        <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                                <MdLanguage className="text-primary text-xl" />
                            </div>
                            <Link href={festival.website} target="_blank" rel="noopener noreferrer" className="font-semibold link-primary text-sm underline">
                                {t('VisitWebsite')}
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            {festival.description && (
                <div className="px-6 pb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{t('AboutFestival')}</h3>
                        <p className="text-gray-700">{festival.description}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
