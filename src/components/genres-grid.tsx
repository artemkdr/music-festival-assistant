import React, { useState } from 'react';
import { FaSortAlphaDown, FaSortAmountDown } from 'react-icons/fa';

interface GenresGridProps {
    genres: { name: string; count: number }[];
    selectedGenres: string[];
    onGenreToggle: (genre: string) => void;
    maxGenres?: number;
    isLoading?: boolean;
}

type SortMode = 'default' | 'alphabetical';

export const GenresGrid: React.FC<GenresGridProps> = ({ genres, selectedGenres, onGenreToggle, maxGenres = 20, isLoading = false }) => {
    const [showAll, setShowAll] = useState(false);
    const [sortMode, setSortMode] = useState<SortMode>('default');

    const handleGenreToggle = (genre: string) => {
        onGenreToggle(genre);
    };

    const handleSortToggle = () => {
        setSortMode(prev => (prev === 'default' ? 'alphabetical' : 'default'));
    };

    // Sort genres based on current sort mode
    const sortedGenres = sortMode === 'alphabetical' ? [...genres].sort((a, b) => a.name.localeCompare(b.name)) : genres;

    const displayedGenres = showAll ? sortedGenres : sortedGenres.slice(0, maxGenres);
    const hasMoreGenres = genres.length > maxGenres;

    return (
        <div className="flex flex-col gap-2">
            {/* Sort button */}
            <div className="flex justify-end -mt-2">
                <button type="button" onClick={handleSortToggle} className="btn-primary-light text-xs px-3 py-1 rounded-lg flex items-center gap-1" disabled={isLoading}>
                    <span>Sort: {sortMode === 'default' ? 'Popularity' : 'A-Z'}</span>
                    <span>{sortMode === 'default' ? <FaSortAmountDown size={12} /> : <FaSortAlphaDown size={12} />}</span>
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {displayedGenres.map((genre, index) => (
                    <button
                        key={genre.name}
                        type="button"
                        onClick={() => handleGenreToggle(genre.name)}
                        className={`text-sm transition-all duration-300 ease-out opacity-0 animate-fade-in ${selectedGenres.includes(genre.name) ? 'btn-primary' : 'btn-primary-light border-1 border-primary/30'}`}
                        style={{
                            animationDelay: `${index < maxGenres ? index * 30 : 0}ms`,
                            animationFillMode: 'forwards',
                        }}
                        disabled={isLoading}
                    >
                        {genre.name} ({genre.count})
                    </button>
                ))}
            </div>

            {hasMoreGenres && (
                <div className="flex justify-center w-full">
                    <button type="button" className="btn-primary-light text-xs bg-primary/10 rounded-2xl mt-2" onClick={() => setShowAll(prev => !prev)}>
                        {showAll ? 'Show less' : `Show all ${genres.length} genres`}
                        <span className="inline-block transform transition-transform duration-200" style={{ rotate: showAll ? '180deg' : '0deg' }}>
                            ▼
                        </span>
                    </button>
                </div>
            )}

            <p className="mt-2 text-sm text-gray-500">Select genres you enjoy ({selectedGenres.length} selected)</p>
        </div>
    );
};
