'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimeApi } from '@/lib/api';
import AnimeCard from '@/components/AnimeCard';
import { Search, ChevronLeft, ChevronRight, Filter, Sparkles, RotateCcw } from 'lucide-react';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || '');
  const [format, setFormat] = useState(searchParams.get('format') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'trending');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get('page') || '1', 10)));

  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    currentPage: 1,
    lastPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [genresList, setGenresList] = useState([]);

  useEffect(() => {
    AnimeApi.getGenres().then(setGenresList).catch(console.error);
  }, []);

  const updateSearchUrl = (updates = {}) => {
    const params = new URLSearchParams(searchParams.toString());

    const merged = {
      q: updates.q !== undefined ? updates.q : query,
      genre: updates.genre !== undefined ? updates.genre : genre,
      format: updates.format !== undefined ? updates.format : format,
      sort: updates.sort !== undefined ? updates.sort : sort,
      status: updates.status !== undefined ? updates.status : status,
      page: updates.page !== undefined ? updates.page : 1,
    };

    Object.entries(merged).forEach(([key, val]) => {
      if (!val || val === 'All' || (key === 'sort' && val === 'trending') || (key === 'page' && Number(val) === 1)) {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });

    const queryString = params.toString();
    router.push(queryString ? `/search?${queryString}` : '/search');
  };

  const performSearch = async (paramsObj) => {
    setIsLoading(true);
    try {
      const data = await AnimeApi.search({
        q: paramsObj.q?.trim() || undefined,
        genre: paramsObj.genre || undefined,
        format: paramsObj.format || undefined,
        sort: paramsObj.sort || undefined,
        status: paramsObj.status || undefined,
        page: paramsObj.targetPage || 1,
        per_page: 24,
      });

      setResults(data?.results || []);
      setPagination(
        data?.pageInfo || {
          total: (data?.results || []).length,
          currentPage: paramsObj.targetPage || 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: (paramsObj.targetPage || 1) > 1,
        }
      );
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync state and perform search when searchParams change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const g = searchParams.get('genre') || '';
    const f = searchParams.get('format') || '';
    const s = searchParams.get('sort') || 'trending';
    const st = searchParams.get('status') || '';
    const p = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

    setQuery(q);
    setGenre(g);
    setFormat(f);
    setSort(s);
    setStatus(st);
    setPage(p);

    performSearch({
      q,
      genre: g,
      format: f,
      sort: s,
      status: st,
      targetPage: p,
    });
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateSearchUrl({ q: query, page: 1 });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    if (newPage === page) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateSearchUrl({ page: newPage });
  };

  const handleClearFilters = () => {
    setQuery('');
    setGenre('');
    setFormat('');
    setSort('trending');
    setStatus('');
    router.push('/search');
  };

  // Generate page numbers for the pagination bar
  const generatePageNumbers = () => {
    const current = pagination.currentPage || page || 1;
    const last = Math.max(pagination.lastPage || 1, pagination.hasNextPage ? current + 1 : current);
    const pages = [];

    if (last <= 7) {
      for (let i = 1; i <= last; i++) pages.push(i);
    } else {
      pages.push(1);

      if (current > 3) {
        pages.push('ellipsis-left');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(last - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < last - 2) {
        pages.push('ellipsis-right');
      }

      pages.push(last);
    }

    return pages;
  };

  const hasActiveFilters = Boolean(query || genre || format || status || sort !== 'trending');

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-16 py-6 sm:py-10 pb-20 flex flex-col gap-6 sm:gap-8">
      {/* Search Controls Header */}
      <div className="flex flex-col gap-5 sm:gap-6 border-b border-[#4d4635]/40 pb-6 sm:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-['Bodoni_Moda'] text-2xl sm:text-4xl md:text-5xl font-bold text-[#e2e2e2] flex items-center gap-2.5 sm:gap-3">
              <Search className="w-6 h-6 sm:w-8 sm:h-8 text-[#ffe9b0]" />
              Browse & Search Anime
            </h1>
            <p className="text-xs sm:text-sm text-[#99907c] mt-1">
              Explore thousands of anime series, movies, and seasonal releases with full multi-page navigation.
            </p>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => updateSearchUrl({ status: 'ongoing', sort: 'trending', genre: '', format: '', q: '', page: 1 })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                status === 'ongoing' && !genre && !format && !query
                  ? 'bg-[#ffe9b0] text-[#241a00]'
                  : 'bg-[#1E2020] text-[#d0c5af] border border-[#4d4635]/50 hover:border-[#ffe9b0]'
              }`}
            >
              Top Airing
            </button>
            <button
              onClick={() => updateSearchUrl({ sort: 'popular', status: '', genre: '', format: '', q: '', page: 1 })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                sort === 'popular' && !status && !genre && !format && !query
                  ? 'bg-[#ffe9b0] text-[#241a00]'
                  : 'bg-[#1E2020] text-[#d0c5af] border border-[#4d4635]/50 hover:border-[#ffe9b0]'
              }`}
            >
              Most Popular
            </button>
            <button
              onClick={() => updateSearchUrl({ format: 'MOVIE', status: '', genre: '', sort: 'popular', q: '', page: 1 })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                format === 'MOVIE'
                  ? 'bg-[#ffe9b0] text-[#241a00]'
                  : 'bg-[#1E2020] text-[#d0c5af] border border-[#4d4635]/50 hover:border-[#ffe9b0]'
              }`}
            >
              Movies
            </button>
          </div>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type anime title (e.g. Solo Leveling, Demon Slayer, Frieren)..."
              className="w-full bg-[#1E2020] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] rounded-xl pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3.5 text-xs sm:text-sm md:text-base focus:outline-none focus:ring-1 focus:ring-[#ffe9b0] transition-all"
            />
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#99907c] absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            className="px-4 sm:px-7 py-2.5 sm:py-3.5 bg-[#ffe9b0] text-[#241a00] font-bold rounded-xl text-xs sm:text-sm hover:bg-[#f2ca50] transition-colors shadow cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Genre Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#99907c]">Genre:</label>
            <select
              value={genre}
              onChange={(e) => updateSearchUrl({ genre: e.target.value, page: 1 })}
              className="bg-[#1E2020] border border-[#4d4635] text-[#e2e2e2] text-xs rounded-lg px-3 py-2 focus:border-[#ffe9b0] focus:outline-none cursor-pointer"
            >
              <option value="">All Genres</option>
              {genresList.map((g) => {
                const gName = typeof g === 'string' ? g : g.name;
                return (
                  <option key={gName} value={gName}>{gName}</option>
                );
              })}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#99907c]">Status:</label>
            <select
              value={status}
              onChange={(e) => updateSearchUrl({ status: e.target.value, page: 1 })}
              className="bg-[#1E2020] border border-[#4d4635] text-[#e2e2e2] text-xs rounded-lg px-3 py-2 focus:border-[#ffe9b0] focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ongoing">Currently Airing</option>
              <option value="released">Finished / Released</option>
              <option value="latest">Upcoming</option>
            </select>
          </div>

          {/* Format Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#99907c]">Format:</label>
            <select
              value={format}
              onChange={(e) => updateSearchUrl({ format: e.target.value, page: 1 })}
              className="bg-[#1E2020] border border-[#4d4635] text-[#e2e2e2] text-xs rounded-lg px-3 py-2 focus:border-[#ffe9b0] focus:outline-none cursor-pointer"
            >
              <option value="">All Formats</option>
              <option value="TV">TV Series</option>
              <option value="MOVIE">Movie</option>
              <option value="OVA">OVA</option>
              <option value="ONA">ONA</option>
              <option value="SPECIAL">Special</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#99907c]">Sort by:</label>
            <select
              value={sort}
              onChange={(e) => updateSearchUrl({ sort: e.target.value, page: 1 })}
              className="bg-[#1E2020] border border-[#4d4635] text-[#e2e2e2] text-xs rounded-lg px-3 py-2 focus:border-[#ffe9b0] focus:outline-none cursor-pointer"
            >
              <option value="trending">Trending</option>
              <option value="popular">Most Popular</option>
              <option value="score">Highest Rated</option>
              <option value="newest">Recently Added</option>
              <option value="favorites">Most Favorited</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-[#ffe9b0] hover:underline ml-auto flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Section */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
          <div className="w-12 h-12 border-4 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-[#d0c5af]">Searching library & catalogue...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 text-center px-4">
          <Search className="w-12 h-12 text-[#ffe9b0]/40" />
          <h3 className="font-['Bodoni_Moda'] text-2xl text-[#e2e2e2]">No anime found</h3>
          <p className="text-xs text-[#99907c] max-w-md">
            Try adjusting your search query, clearing genre filters, or switching categories.
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-xl bg-[#ffe9b0] text-[#241a00] font-bold text-xs hover:bg-[#f2ca50] transition-colors cursor-pointer mt-2"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Results Header Info */}
          <div className="flex items-center justify-between text-xs text-[#99907c]">
            <span>
              Showing results on page <strong className="text-[#ffe9b0]">{pagination.currentPage || page}</strong>
            </span>
            <span>
              {results.length} anime on this page
            </span>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {results.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>

          {/* Multi-Page Pagination Bar */}
          {(pagination.hasNextPage || (pagination.currentPage || page) > 1 || (pagination.lastPage && pagination.lastPage > 1)) && (
            <nav
              aria-label="Pagination Navigation"
              className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 pt-8 border-t border-[#4d4635]/30 mt-4"
            >
              {/* Previous Page Button */}
              <button
                onClick={() => handlePageChange((pagination.currentPage || page) - 1)}
                disabled={(pagination.currentPage || page) <= 1}
                aria-label="Previous Page"
                className="flex items-center gap-1 px-3 sm:px-4 py-2 rounded-xl bg-[#1E2020] border border-[#4d4635] text-xs font-semibold text-[#e2e2e2] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#ffe9b0] hover:text-[#ffe9b0] transition-all cursor-pointer shadow"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {generatePageNumbers().map((pNum, index) => {
                  if (pNum === 'ellipsis-left' || pNum === 'ellipsis-right') {
                    return (
                      <span key={`${pNum}-${index}`} className="px-2 py-1 text-xs text-[#99907c]">
                        …
                      </span>
                    );
                  }

                  const isActive = pNum === (pagination.currentPage || page);

                  return (
                    <button
                      key={pNum}
                      onClick={() => handlePageChange(pNum)}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={`Go to page ${pNum}`}
                      className={`min-w-[34px] sm:min-w-[38px] h-[34px] sm:h-[38px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow ${
                        isActive
                          ? 'bg-[#ffe9b0] text-[#241a00] shadow-[0_0_12px_rgba(255,233,176,0.35)] scale-105'
                          : 'bg-[#1E2020] text-[#d0c5af] border border-[#4d4635]/60 hover:border-[#ffe9b0] hover:text-[#ffe9b0]'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                onClick={() => handlePageChange((pagination.currentPage || page) + 1)}
                disabled={!pagination.hasNextPage && (pagination.currentPage || page) >= pagination.lastPage}
                aria-label="Next Page"
                className="flex items-center gap-1 px-3 sm:px-4 py-2 rounded-xl bg-[#1E2020] border border-[#4d4635] text-xs font-semibold text-[#e2e2e2] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#ffe9b0] hover:text-[#ffe9b0] transition-all cursor-pointer shadow"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
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

