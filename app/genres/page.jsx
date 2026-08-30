'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimeApi } from '@/lib/api';
import { LayoutGrid, Sparkles } from 'lucide-react';

export default function GenresPage() {
  const router = useRouter();
  const [genres, setGenres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AnimeApi.getGenres()
      .then((data) => setGenres(data || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
        <div className="w-12 h-12 border-4 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-[#d0c5af]">Loading genres catalogue...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-16 py-6 sm:py-10 pb-20 flex flex-col gap-6 sm:gap-8">
      <div className="border-b border-[#4d4635]/40 pb-5 sm:pb-6">
        <h1 className="font-['Bodoni_Moda'] text-2xl sm:text-4xl md:text-5xl font-bold text-[#e2e2e2] flex items-center gap-2.5 sm:gap-3">
          <LayoutGrid className="w-6 h-6 sm:w-8 sm:h-8 text-[#ffe9b0]" />
          Anime Genres & Categories
        </h1>
        <p className="text-xs sm:text-sm text-[#99907c] mt-1">
          Discover your next favorite series filtered by theme, atmosphere, and storytelling style.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
        {genres.map((genre) => {
          const gName = typeof genre === 'string' ? genre : genre.name;
          return (
            <button
              key={gName}
              onClick={() => router.push(`/search?genre=${encodeURIComponent(gName)}`)}
              className="group p-4 sm:p-6 rounded-2xl bg-[#1E2020] border border-[#4d4635]/40 hover:border-[#ffe9b0] hover:bg-[#282a2a] transition-all flex flex-col items-center text-center gap-2.5 sm:gap-3 shadow-lg transform hover:-translate-y-1 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#121414] group-hover:bg-[#ffe9b0] text-[#ffe9b0] group-hover:text-[#241a00] flex items-center justify-center transition-colors shadow">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-['Bodoni_Moda'] text-lg font-bold text-[#e2e2e2] group-hover:text-[#ffe9b0] transition-colors">
                  {gName}
                </h3>
                <span className="text-xs text-[#99907c] mt-1 block">
                  Browse Titles →
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

