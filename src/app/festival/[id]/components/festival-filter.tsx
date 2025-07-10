/**
 * Festival search filter component with sticky behavior
 * Displays search input that becomes sticky when scrolled out of view
 */
'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

interface FestivalFilterProps {
    searchFilter: string;
    onSearch: (value: string) => void;
    totalFilteredPerformances: number;
    totalPerformances: number;
}

export function FestivalFilter({ searchFilter, onSearch, totalFilteredPerformances, totalPerformances }: FestivalFilterProps): React.ReactElement {
    const t = useTranslations('FestivalPage');

    const renderSearchInput = () => (
        <div className="relative">
            <input
                type="search"
                placeholder={t('SearchByArtistOrStage')}
                value={searchFilter}
                onChange={e => onSearch(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            />
        </div>
    );

    const renderFilterStatus = () => {
        if (!searchFilter) return null;

        return (
            <div className="mt-2 text-sm text-gray-600">
                {totalFilteredPerformances === 0 ? (
                    <span>{t('NoResults')}</span>
                ) : (
                    <span>
                        {t('ShowingResults', { count: totalFilteredPerformances, total: totalPerformances })}{' '}
                        <button onClick={() => onSearch('')} className="ml-2 text-primary hover:text-primary/80 underline">
                            {t('ClearFilter')}
                        </button>
                    </span>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="mt-4">
                {renderSearchInput()}
                {renderFilterStatus()}
            </div>
        </>
    );
}
