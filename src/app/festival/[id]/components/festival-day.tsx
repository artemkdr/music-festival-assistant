/**
 * Festival day component
 * Displays a collapsible day section with all performances for that day
 */
'use client';

import { FestivalAct } from '@/app/festival/[id]/components/festival-act';
import { Artist, Festival } from '@/lib/schemas';
import { formatDateString } from '@/lib/utils/date-util';
import { useTranslations } from 'next-intl';
import React from 'react';
import { MdCalendarToday, MdExpandLess } from 'react-icons/md';

interface FestivalDayProps {
    dayLineup: {
        date: string;
        list: {
            artistName: string;
            artistId?: string;
            stage?: string;
            time?: string;
            date?: string;
        }[];
    };
    dayIndex: number;
    isOpen: boolean;
    onToggle: () => void;
    festival: Festival;
    artistInfoMap: Record<string, Artist>;
    artistInfoVisible: Record<string, boolean>;
    artistLoading: Record<string, boolean>;
    onArtistInfoClick: (performance: { artistId?: string; artistName: string }, dayIndex: number, performanceIndex: number) => void;
}

export function FestivalDay({ dayLineup, dayIndex, isOpen, onToggle, festival, artistInfoMap, artistInfoVisible, artistLoading, onArtistInfoClick }: FestivalDayProps): React.ReactElement {
    const tCommon = useTranslations('Common');

    return (
        <div id={`day-container-${dayIndex}`} className="flex flex-col gap-2 border-1 border-primary/20 p-2 rounded-lg">
            <button
                type="button"
                className="w-full flex items-center justify-between text-left focus:outline-none hover:bg-gray-100 p-2 rounded"
                onClick={onToggle}
                aria-expanded={isOpen}
                aria-controls={`day-lineup-${dayIndex}`}
            >
                <span className="flex items-center text-xl font-bold text-gray-900">
                    <MdCalendarToday className="mr-2 text-primary" />
                    {formatDateString(
                        dayLineup.date,
                        {
                            year: 'numeric',
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                        },
                        tCommon('TBA')
                    )}
                </span>
                <MdExpandLess size={32} className={`text-primary transition-transform ${isOpen ? '' : 'transform rotate-180'}`} />
            </button>
            {isOpen && (
                <div className="grid gap-3" id={`day-lineup-${dayIndex}`}>
                    {dayLineup.list
                        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                        .map((performance, index) => {
                            const key = `${dayIndex}-${index}`;
                            const artist = (performance.artistId && artistInfoMap[performance.artistId] ? artistInfoMap[performance.artistId] : artistInfoMap[key]) ?? {
                                id: '',
                                name: performance.artistName,
                            };

                            return (
                                <FestivalAct
                                    key={index}
                                    performance={performance}
                                    dayDate={dayLineup.date}
                                    festival={festival}
                                    artist={artist}
                                    isArtistInfoVisible={artistInfoVisible[key] || false}
                                    isArtistLoading={artistLoading[key] || false}
                                    onArtistInfoClick={() => onArtistInfoClick(performance, dayIndex, index)}
                                />
                            );
                        })}
                </div>
            )}
        </div>
    );
}
