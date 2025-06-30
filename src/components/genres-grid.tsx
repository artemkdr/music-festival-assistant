import React, { useState } from 'react';

interface GenresGridProps {
    genres: { name: string; count: number }[];
    selectedGenres: string[];
    onGenreToggle: (genre: string) => void;
    maxGenres?: number;
    isLoading?: boolean;
}

export const GenresGrid: React.FC<GenresGridProps> = ({ genres, selectedGenres, onGenreToggle, maxGenres = 20, isLoading = false }) => {
    const [showAll, setShowAll] = useState(false);

    const handleGenreToggle = (genre: string) => {
        onGenreToggle(genre);
    };

    const displayedGenres = showAll ? genres : genres.slice(0, maxGenres);
    const hasMoreGenres = genres.length > maxGenres;

    return (
        <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {displayedGenres.map(genre => (
                    <button
                        key={genre.name}
                        type="button"
                        onClick={() => handleGenreToggle(genre.name)}
                        className={`text-sm transition-colors ${selectedGenres.includes(genre.name) ? 'btn-primary' : 'btn-primary-light border-1 border-primary/30'}`}
                        disabled={isLoading}
                    >
                        {genre.name} ({genre.count})
                    </button>
                ))}
            </div>
            {hasMoreGenres && (
                <div className="flex justify-center w-full">
                    <button type="button" className="btn-primary-light text-xs bg-primary/10 rounded-2xl mt-2" onClick={() => setShowAll(prev => !prev)}>
                        {showAll ? 'Show less' : 'Show all the genres'}
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
