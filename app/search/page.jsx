'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimeApi } from '@/lib/api';
import AnimeCard from '@/components/AnimeCard';
import { Search } from 'lucide-react';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || '');
  const [format, setFormat] = useState(searchParams.get('format') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'trending');
  const [page, setPage] = useState(1);

  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, currentPage: 1, lastPage: 1, hasNextPage: false });
  const [isLoading, setIsLoading] = useState(false);
  const [genresList, setGenresList] = useState([]);

  useEffect(() => {
    AnimeApi.getGenres().then(setGenresList).catch(console.error);
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const g = searchParams.get('genre') || '';
    const f = searchParams.get('format') || '';
    const s = searchParams.get('sort') || 'trending';

    setQuery(q);
    setGenre(g);
    setFormat(f);
    setSort(s);
  }, [searchParams]);

  const performSearch = async (targetPage = 1) => {
    setIsLoading(true);
    try {
      const data = await AnimeApi.search({
        q: query.trim() || undefined,
        genre: genre || undefined,
        format: format || undefined,
        sort: sort || undefined,
        page: targetPage,
        per_page: 24,
      });
      setResults(data?.results || []);
      setPagination(data?.pageInfo || { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false });
      setPage(targetPage);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    performSearch(1);
  }, [genre, format, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(1);
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-16 py-6 sm:py-10 pb-20 flex flex-col gap-6 sm:gap-8">
      {/* Search Controls Header */}
      <div className="flex flex-col gap-4 sm:gap-6 border-b border-[#4d4635]/40 pb-6 sm:pb-8">
        <div>
          <h1 className="font-['Bodoni_Moda'] text-2xl sm:text-4xl md:text-5xl font-bold text-[#e2e2e2] flex items-center gap-2.5">
            <Search className="w-7 h-7 sm:w-8 sm:h-8 text-[#ffe9b0]" />
            Browse & Search Anime
          </h1>
          <p className="text-xs sm:text-sm text-[#99907c] mt-1">
            Explore thousands of anime series, movies, and seasonal releases.
          </p>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type anime title (e.g. Solo Leveling, Demon Slayer)..."
              className="w-full bg-[#1E2020] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] rounded-xl pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 text-xs sm:text-base focus:outline-none focus:ring-1 focus:ring-[#ffe9b0] transition-all"
            />
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#99907c] absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            className="px-5 sm:px-7 py-3 sm:py-3.5 bg-[#ffe9b0] text-[#241a00] font-bold rounded-xl text-xs sm:text-sm hover:bg-[#f2ca50] transition-colors shadow cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <label className="text-xs text-[#99907c]">Genre:</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="bg-[#1E2020] border border-[#4d4635] text-[#e2e2e2] text-xs rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 focus:border-[#ffe9b0] focus:outline-none cursor-pointer"
            >
              <option value="">All Genres</option>
              {genresList.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <label className="text-xs text-[#99907c]">Format:</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="bg-[#1E2020] border border-[#4d4635] text-[#e2e2e2] text-xs rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 focus:border-[#ffe9b0] focus:outline-none cursor-pointer"
            >
              <option value="">All Formats</option>
              <option value="TV">TV Series</option>
              <option value="MOVIE">Movie</option>
              <option value="OVA">OVA</option>
              <option value="ONA">ONA</option>
              <option value="SPECIAL">Special</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <label className="text-xs text-[#99907c]">Sort:</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-[#1E2020] border border-[#4d4635] text-[#e2e2e2] text-xs rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 focus:border-[#ffe9b0] focus:outline-none cursor-pointer"
            >
              <option value="trending">Trending</option>
              <option value="popular">Most Popular</option>
              <option value="score">Highest Rated</option>
              <option value="newest">Recently Added</option>
              <option value="favorites">Most Favorited</option>
            </select>
          </div>

          {(query || genre || format || sort !== 'trending') && (
            <button
              onClick={() => {
                setQuery('');
                setGenre('');
                setFormat('');
                setSort('trending');
              }}
              className="text-xs text-[#ffe9b0] hover:underline ml-auto cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
          <div className="w-12 h-12 border-4 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-[#d0c5af]">Searching library...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 text-center px-4">
          <Search className="w-12 h-12 text-[#ffe9b0]/40" />
          <h3 className="font-['Bodoni_Moda'] text-xl sm:text-2xl text-[#e2e2e2]">No anime found</h3>
          <p className="text-xs text-[#99907c] max-w-md">
            Try adjusting your search query, clearing genre filters, or searching by Japanese/English titles.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-5">
            {results.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>

          {pagination.lastPage > 1 && (
            <div className="flex justify-center items-center gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-[#4d4635]/30">
              <button
                onClick={() => performSearch(page - 1)}
                disabled={page <= 1}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#1E2020] border border-[#4d4635] text-xs font-semibold text-[#e2e2e2] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#ffe9b0] transition-all cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs text-[#d0c5af]">
                Page <strong className="text-[#ffe9b0]">{pagination.currentPage}</strong> of {pagination.lastPage}
              </span>
              <button
                onClick={() => performSearch(page + 1)}
                disabled={!pagination.hasNextPage && page >= pagination.lastPage}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#1E2020] border border-[#4d4635] text-xs font-semibold text-[#e2e2e2] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#ffe9b0] transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
          <div className="w-12 h-12 border-4 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-[#d0c5af]">Loading search catalog...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
