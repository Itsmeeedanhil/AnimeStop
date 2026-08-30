import React, { useState, useEffect } from 'react';
import { AnimeApi } from '../services/api';

export default function GenresPage({ navigate }) {
    const [genres, setGenres] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        AnimeApi.getGenres()
            .then((data) => setGenres(data))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
                <span className="w-12 h-12 border-3 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></span>
                <p className="text-sm text-[#d0c5af]">Loading genres catalogue...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-16 py-10 pb-20 flex flex-col gap-8">
            <div className="border-b border-[#4d4635]/40 pb-6">
                <h1 className="font-['Bodoni_Moda'] text-3xl md:text-5xl font-bold text-[#e2e2e2] flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#ffe9b0] text-4xl">category</span>
                    Anime Genres & Categories
                </h1>
                <p className="text-sm text-[#99907c] mt-1">
                    Discover your next favorite series filtered by theme, atmosphere, and storytelling style.
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {genres.map((genre) => (
                    <button
                        key={genre.name}
                        onClick={() => navigate(`/search?genre=${genre.name}`)}
                        className="group p-6 rounded-2xl bg-[#1E2020] border border-[#4d4635]/40 hover:border-[#ffe9b0] hover:bg-[#282a2a] transition-all flex flex-col items-center text-center gap-3 shadow-lg transform hover:-translate-y-1 cursor-pointer"
                    >
                        <span className="w-14 h-14 rounded-full bg-[#121414] group-hover:bg-[#ffe9b0] text-[#ffe9b0] group-hover:text-[#241a00] flex items-center justify-center transition-colors shadow">
                            <span className="material-symbols-outlined text-3xl">
                                {genre.icon || 'star'}
                            </span>
                        </span>
                        <div>
                            <h3 className="font-['Bodoni_Moda'] text-lg font-bold text-[#e2e2e2] group-hover:text-[#ffe9b0] transition-colors">
                                {genre.name}
                            </h3>
                            <span className="text-xs text-[#99907c] mt-1 block">
                                {genre.count} Titles Available
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

