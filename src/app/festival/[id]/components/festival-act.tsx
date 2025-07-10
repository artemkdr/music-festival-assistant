/**
 * Festival act/performance component
 * Displays individual artist performance with calendar actions and artist info
 */
'use client';

import { ArtistInfo } from '@/app/festival/[id]/components/artist-info';
import { ButtonWithIcon } from '@/app/lib/components/button-with-icon';
import { Artist, Festival } from '@/lib/schemas';
import { addToGoogleCalendar, downloadICSCalendar } from '@/lib/utils/agenda-util';
import { extractStartTime, isValidDate } from '@/lib/utils/date-util';
import { useTranslations } from 'next-intl';
import React from 'react';
import { FaGoogle, FaInfoCircle } from 'react-icons/fa';
import { LuCalendarArrowDown } from 'react-icons/lu';
import { TbClock } from 'react-icons/tb';

interface FestivalActProps {
    performance: {
        artistName: string;
        artistId?: string;
        stage?: string;
        time?: string;
        date?: string;
    };
    dayDate: string;
    festival: Festival;
    artist?: Artist;
    isArtistInfoVisible: boolean;
    isArtistLoading: boolean;
    onArtistInfoClick: () => void;
}

export function FestivalAct({ performance, dayDate, festival, artist, isArtistInfoVisible, isArtistLoading, onArtistInfoClick }: FestivalActProps): React.ReactElement {
    const t = useTranslations('FestivalPage');
    const tCommon = useTranslations('Common');

    const addToGoogleCalendarHandler = () => {
        addToGoogleCalendar({
            date: dayDate || '',
            time: performance.time || '20:00',
            festival: festival.name,
            artist: performance.artistName,
            stage: performance.stage || festival.location || '',
        });
    };

    const downloadICSCalendarHandler = () => {
        const eventData: { date: string; time: string; artist: string; stage?: string } = {
            date: dayDate || '',
            time: performance.time || '20:00',
            artist: performance.artistName,
        };
        if (performance.stage) {
            eventData.stage = performance.stage;
        }
        try {
            downloadICSCalendar(festival, eventData);
        } catch {
            // @TODO handle error gracefully, maybe show a toast notification
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4 bg-primary/6 rounded-lg hover:bg-primary/15 transition-colors">
            <div className="flex space-x-4">
                <div className="flex flex-col">
                    <div className="font-semibold text-gray-900">{performance.artistName}</div>
                    <div className="flex flex-row gap-1 items-center text-sm text-gray-600">
                        <TbClock size={12} />
                        <span>{performance.time || tCommon('TBA')}</span>
                        {performance.stage && (
                            <>
                                <span className="text-foreground/30">|</span>
                                <span className="text-sm text-gray-600">{performance.stage}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Show 'Add to calendars button only if the date is valid */}
            {isValidDate(new Date(`${dayDate}T${extractStartTime(performance.time || '19:00')}`)) && (
                <div className="flex flex-wrap gap-4 py-2">
                    <ButtonWithIcon icon={<LuCalendarArrowDown size={20} />} label={t('DownloadICS')} onClick={downloadICSCalendarHandler} className="link-secondary underline" />
                    <ButtonWithIcon icon={<FaGoogle size={20} />} label={t('AddToGoogleCalendar')} onClick={addToGoogleCalendarHandler} className="link-secondary underline" />
                </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 items-center">
                {isArtistInfoVisible && artist && <ArtistInfo festival={festival} artist={artist} />}
                <button
                    onClick={onArtistInfoClick}
                    title={t('ShowArtistInfo')}
                    className={`link-primary bg-primary/15 rounded-full transition-all p-2 ${isArtistLoading ? 'animate-bounce [animation-duration:_.4s]' : ''}`}
                    disabled={isArtistLoading}
                >
                    <FaInfoCircle size={26} />
                </button>
            </div>
        </div>
    );
}
