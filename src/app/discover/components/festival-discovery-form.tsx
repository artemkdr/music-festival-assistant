'use client';

import { SupportMeButton } from '@/app/components/support-me-button';
import { discoverApi, FestivalInfo } from '@/app/discover/api-client/discover-api';
import { GenresGrid } from '@/app/discover/components/genres-grid';
import { UserPreferences } from '@/lib/schemas';
import { formatDateString } from '@/lib/utils/date-util';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { BsMusicNoteList } from 'react-icons/bs';
import { MdExpandLess, MdFestival } from 'react-icons/md';

interface FestivalDiscoveryFormProps {
    onSubmit: (festivalId: string, userPreferences: UserPreferences) => Promise<void>;
    onChange?: (festivalId: string) => void;
    isLoading: boolean;
}

/**
 * Form component for festival discovery input
 */
export function FestivalDiscoveryForm({ onSubmit, isLoading, onChange }: FestivalDiscoveryFormProps): ReactElement {
    const t = useTranslations('FestivalDiscovery');
    const locale = useLocale(); // Get locale dynamically, default to 'en' if not set
    const [festivals, setFestivals] = useState<FestivalInfo[]>([]);
    const [selectedFestivalId, setSelectedFestivalId] = useState('');
    const [festivalSearchTerm, setFestivalSearchTerm] = useState('');
    const [showFestivalDropdown, setShowFestivalDropdown] = useState(false);
    const [loadingFestivals, setLoadingFestivals] = useState(false);
    const [specificDate, setSpecificDate] = useState<string>('');
    const [availableGenres, setAvailableGenres] = useState<
        {
            name: string;
            count: number;
        }[]
    >([]); // now dynamic
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [loadingGenres, setLoadingGenres] = useState(false);
    const [discoveryMode, setDiscoveryMode] = useState<'conservative' | 'balanced' | 'adventurous'>('balanced');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [festivalsCountStatus, setFestivalsCountStatus] = useState('');
    const [userNotes, setUserNotes] = useState('');
    const [recommendationsCount, setRecommendationsCount] = useState(5); // Default to 5 recommendations
    const searchParams = useSearchParams();

    // Load festivals on component mount
    useEffect(() => {
        setSpecificDate(''); // Reset specific date on mount
        const loadFestivals = async () => {
            setLoadingFestivals(true);
            try {
                const response = await discoverApi.getFestivals();
                if (response.status === 'success' && response.data) {
                    const sortedData = response.data.sort((a, b) => {
                        // Sort by start date, then by name
                        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime() || a.name.localeCompare(b.name);
                    });
                    setFestivals(sortedData);
                    // check if festival id is in URL
                    const festivalId = searchParams.get('festival');
                    if (festivalId) {
                        const festival = response.data.find(f => f.id === festivalId);
                        if (festival) {
                            setSelectedFestivalId(festivalId);
                            setFestivalSearchTerm(festival.name);
                            setShowFestivalDropdown(false);
                        }
                    } else {
                        setSelectedFestivalId('');
                        setFestivalSearchTerm('');
                        setShowFestivalDropdown(false);
                    }
                    if (sortedData.length) {
                        setFestivalsCountStatus(t('FestivalsCountStatus', { count: sortedData.length }));
                    } else {
                        setFestivalsCountStatus(t('NoFestivals'));
                    }
                }
            } catch {
                setFestivalsCountStatus(t('ErrorLoadingFestivals'));
            } finally {
                setLoadingFestivals(false);
            }
        };
        loadFestivals();
    }, [searchParams, t]);

    // Load genres when a festival is selected
    useEffect(() => {
        setSpecificDate(''); // Reset specific date on mount
        if (!selectedFestivalId) {
            setAvailableGenres([]);
            setSelectedGenres([]);
            return;
        }
        // reset results and inputs
        setUserNotes('');
        setLoadingGenres(true);
        discoverApi
            .getFestivalGenres(selectedFestivalId)
            .then(response => {
                if (response.status === 'success' && response.data) {
                    setAvailableGenres(
                        response.data as {
                            name: string;
                            count: number;
                        }[]
                    );
                } else {
                    setAvailableGenres([]);
                }
            })
            .catch(() => {
                setAvailableGenres([]);
            })
            .finally(() => setLoadingGenres(false));
    }, [selectedFestivalId]);

    // Get selected festival details
    const selectedFestival = festivals.find(f => f.id === selectedFestivalId);

    /**
     * Handle form submission
     */
    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();

        // Reset errors
        setErrors({});

        // Validate form
        const newErrors: Record<string, string> = {};

        if (!selectedFestivalId) {
            newErrors.festival = t('ValidationSelectFestival');
        }

        if (selectedFestivalId && selectedGenres.length === 0 && !userNotes.trim()) {
            newErrors.genres = t('ValidationSelectGenres');
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Create user preferences
        const userPreferences: UserPreferences = {
            language: locale,
            genres: selectedGenres,
            recommendationStyle: discoveryMode,
            comment: userNotes.trim().substring(0, 500) ?? undefined,
            recommendationsCount,
        };
        if (specificDate) {
            userPreferences.date = specificDate; // Add specific date if selected
        }

        await onSubmit(selectedFestivalId, userPreferences);
    };

    /**
     * Handle festival selection
     */
    const handleFestivalSelect = (festivalId: string): void => {
        setSelectedFestivalId(festivalId);
        const festival = festivals.find(f => f.id === festivalId);
        setFestivalSearchTerm(festival ? festival.name : '');
        setShowFestivalDropdown(false);
        setSelectedGenres([]); // reset genres on festival change
        onChange?.(selectedFestivalId); // Notify parent of festival change
        setErrors({});
    };

    /**
     * Handle genre selection
     */
    const handleGenreToggle = (genre: string): void => {
        setSelectedGenres(prev => (prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]));
    };

    /**
     * Handle discovery mode change
     */
    const handleDiscoveryModeChange = (mode: 'conservative' | 'balanced' | 'adventurous'): void => {
        setDiscoveryMode(mode);
    };

    /**
     * Handle specific date change
     */
    const handleSpecificDateChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        const date = e.target.value;
        setSpecificDate(date);
        // reload genres based on specific date
        if (selectedFestivalId) {
            setLoadingGenres(true);
            discoverApi
                .getFestivalGenres(selectedFestivalId, date)
                .then(response => {
                    if (response.status === 'success' && response.data) {
                        setAvailableGenres(
                            response.data as {
                                name: string;
                                count: number;
                            }[]
                        );
                    } else {
                        setAvailableGenres([]);
                    }
                })
                .catch(() => {
                    setAvailableGenres([]);
                })
                .finally(() => {
                    setLoadingGenres(false);
                });
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Festival Selection */}
                <div>
                    <label htmlFor="festival-search" className={`block font-bold text-base mb-3 ${errors.festival ? 'text-red-500' : ''}`}>
                        {t('SelectFestival')}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            readOnly={true}
                            id="festival-search"
                            value={festivalSearchTerm}
                            onChange={e => {
                                setFestivalSearchTerm(e.target.value);
                                setShowFestivalDropdown(true);
                                if (!e.target.value) {
                                    setSelectedFestivalId('');
                                }
                            }}
                            onFocus={() => setShowFestivalDropdown(true)}
                            placeholder={t('FestivalPlaceholder')}
                            className={`cursor-pointer pr-8 overflow-ellipsis input w-full ${errors.festival ? 'border-red-500' : ''}`}
                            disabled={isLoading || loadingFestivals}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                            aria-label={t('SelectFestival')}
                        />

                        {/* down arrow turning up when it's open */}
                        <div className="absolute right-1 top-1 cursor-pointer z-10" onClick={() => setShowFestivalDropdown(!showFestivalDropdown)}>
                            <MdExpandLess size={32} className={`text-primary transition-transform ${showFestivalDropdown ? '' : 'transform rotate-180'}`} />
                        </div>

                        {/* Loading indicator */}
                        {loadingFestivals && (
                            <div className="absolute right-2 top-2">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-magic"></div>
                            </div>
                        )}

                        {/* Dropdown */}
                        {showFestivalDropdown && !loadingFestivals && (
                            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-110 overflow-auto">
                                {festivals?.length === 0 && <div className="p-4 text-gray-500 text-center text-sm">{t('NoFestivalsFound')}</div>}
                                {festivals?.map(festival => (
                                    <button
                                        key={festival.id}
                                        type="button"
                                        onClick={() => handleFestivalSelect(festival.id)}
                                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0`}
                                    >
                                        <div className="font-medium text-gray-900">{festival.name}</div>
                                        <div className="text-sm text-gray-500">{festival.location}</div>
                                        <div className="text-xs text-gray-400">
                                            {formatDateString(festival.startDate)} - {formatDateString(festival.endDate)}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {festival.artistsCount}+ {t('TotalArtists').toLowerCase()}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Click outside to close dropdown */}
                        {showFestivalDropdown && <div className="fixed inset-0 z-5" onClick={() => setShowFestivalDropdown(false)} />}
                    </div>
                    {/* Selected Festival Display */}
                    {selectedFestival && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-start">
                                <span className="text-primary mt-1 mr-2">
                                    <MdFestival />
                                </span>
                                <div className="flex flex-col gap-0.5">
                                    <div className="font-bold text-primary">{selectedFestival.name}</div>
                                    <div className="text-sm text-primary">{selectedFestival.location}</div>
                                    <div className="text-xs text-primary/80">
                                        {formatDateString(selectedFestival.startDate)} - {formatDateString(selectedFestival.endDate)}, {t('ArtistsCount', { count: selectedFestival.artistsCount })}
                                    </div>
                                    <Link
                                        href={`/festival/${selectedFestival.id}`}
                                        className="link-primary underline font-bold flex items-center gap-2"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={t('FestivalInfo')}
                                    >
                                        <BsMusicNoteList />
                                        <span>{t('FestivalInfo')}</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="text-sm font-medium text-foreground mt-2">{festivalsCountStatus}</div>
                </div>

                {/* Show filters only if a festival is selected */}
                {selectedFestival && (
                    <>
                        {/* Specific Date Selection */}
                        <div>
                            <label htmlFor="specific-date" className="block font-bold text-base mb-3">
                                {t('SpecificDate')}
                            </label>
                            <select id="specific-date" onChange={handleSpecificDateChange} value={specificDate} className="input w-full" disabled={isLoading}>
                                <option value="">{t('AllDates')}</option>
                                {selectedFestival?.dates?.map(date => (
                                    <option key={date} value={date}>
                                        {formatDateString(date, {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                        {/* if it's today then add '(today)' in the label */}
                                        {new Date().toDateString() === new Date(date).toDateString() ? ` (${t('Today')})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Genre Selection */}
                        <div>
                            <label className={`block font-bold text-base mb-3 ${errors.genres ? 'text-red-500' : ''}`}>{t('GenrePreferences')}</label>
                            {loadingGenres ? (
                                <div className="text-magic text-sm flex gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-magic"></div>
                                    <span>{t('LoadingGenres')}</span>
                                </div>
                            ) : (
                                <GenresGrid genres={availableGenres} selectedGenres={selectedGenres} onGenreToggle={handleGenreToggle} isLoading={isLoading} />
                            )}
                        </div>

                        {/* Additional Preferences (Free Text) */}
                        <div>
                            <label htmlFor="user-notes" className="block font-bold text-base mb-3">
                                {t('AdditionalPreferences')}
                            </label>
                            <textarea
                                id="user-notes"
                                value={userNotes}
                                maxLength={500}
                                onChange={e => setUserNotes(e.target.value)}
                                placeholder={t('AdditionalPreferencesPlaceholder')}
                                className="input w-full min-h-[80px] resize-y border rounded-md"
                                disabled={isLoading}
                            />
                        </div>
                        {/* Discovery Mode */}
                        <div>
                            <label className="block font-bold text-base mb-3">{t('DiscoveryMode')}</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    {
                                        value: 'conservative' as const,
                                        title: t('Conservative'),
                                        description: t('ConservativeDesc'),
                                    },
                                    {
                                        value: 'balanced' as const,
                                        title: t('Balanced'),
                                        description: t('BalancedDesc'),
                                    },
                                    {
                                        value: 'adventurous' as const,
                                        title: t('Adventurous'),
                                        description: t('AdventurousDesc'),
                                    },
                                ].map(mode => (
                                    <div
                                        key={mode.value}
                                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                            discoveryMode === mode.value ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                        onClick={() => handleDiscoveryModeChange(mode.value)}
                                    >
                                        <div className="flex items-center mb-2">
                                            <input
                                                type="radio"
                                                name="discovery-mode"
                                                value={mode.value}
                                                checked={discoveryMode === mode.value}
                                                onChange={() => handleDiscoveryModeChange(mode.value)}
                                                className="mr-2"
                                                disabled={isLoading}
                                            />
                                            <h3 className="font-medium text-gray-900">{mode.title}</h3>
                                        </div>
                                        <p className="text-sm text-gray-600">{mode.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendations count */}
                        <div>
                            <label className="block font-bold text-base mb-3">{t('RecommendationsCount')}</label>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="range"
                                    min={1}
                                    max={10}
                                    value={recommendationsCount}
                                    className="input w-30 max-w-99/100 text-center"
                                    disabled={isLoading}
                                    onChange={e => setRecommendationsCount(Number(e.target.value))}
                                />
                                <span className="text-sm text-gray-500">
                                    {t('GetRecommendationsOf', { count: recommendationsCount })} {/* Updated to use new translation key */}
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {errors.festival && <p className="mt-1 text-sm text-red-600">{errors.festival}</p>}
                {errors.genres && <p className="mt-2 text-sm text-red-600">{errors.genres}</p>}

                {/* Submit Button */}
                <div className="flex justify-center">
                    <button type="submit" disabled={isLoading} className="btn-primary bg-magic w-full md:w-auto px-6 py-4">
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <span className="animate-spin mr-2">⏳</span>
                                {t('LoadingRecommendations')}
                            </span>
                        ) : (
                            t('GetRecommendations')
                        )}
                    </button>
                </div>
                {/* Support me button */}
                <div className="flex justify-center">
                    <SupportMeButton variant="link" title={t('SupportMe')} />
                </div>
            </form>
        </div>
    );
}
