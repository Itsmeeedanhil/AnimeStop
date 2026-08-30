import React, { useState, useEffect } from 'react';
import { AnimeApi, LibraryApi } from '../services/api';
import AnimeCard from '../components/AnimeCard';

export default function SearchPage({ initialParams = {}, navigate, showNotification }) {
    const [query, setQuery] = useState(initialParams.q || '');
    const [genre, setGenre] = useState(initialParams.genre || '');
    const [format, setFormat] = useState(initialParams.format || '');
    const [sort, setSort] = useState(initialParams.sort || 'trending');
    const [page, setPage] = useState(1);

    const [results, setResults] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, currentPage: 1, lastPage: 1, hasNextPage: false });
    const [isLoading, setIsLoading] = useState(false);
    const [genresList, setGenresList] = useState([]);
    const [watchlistIds, setWatchlistIds] = useState(new Set());

    useEffect(() => {
        AnimeApi.getGenres().then(setGenresList).catch(console.error);
        LibraryApi.getLibrary().then(lib => {
            setWatchlistIds(new Set((lib.watchlist || []).map(w => w.anime_id)));
        }).catch(console.error);
    }, []);

    // Sync state if initialParams change (e.g. navigation via url)
    useEffect(() => {
        if (initialParams.q !== undefined) setQuery(initialParams.q);
        if (initialParams.genre !== undefined) setGenre(initialParams.genre);
        if (initialParams.format !== undefined) setFormat(initialParams.format);
        if (initialParams.sort !== undefined) setSort(initialParams.sort);
        setPage(1);
    }, [initialParams]);

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
            setResults(data.items || []);
            setPagination(data.pagination || { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false });
            setPage(targetPage);
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        performSearch(page);
    }, [genre, format, sort]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        performSearch(1);
    };

    const handleWatchlistToggle = async (anime) => {
        try {
            const res = await LibraryApi.toggleWatchlist(anime);
            setWatchlistIds(prev => {
                const next = new Set(prev);
                if (res.isBookmarked) {
                    next.add(anime.id);
                    if (showNotification) showNotification(`Added to Watchlist`);
                } else {
                    next.delete(anime.id);
                    if (showNotification) showNotification(`Removed from Watchlist`);
                }
                return next;
            });
        } catch (err) {
            console.error('Failed to toggle watchlist', err);
        }
    };

    return (
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-16 py-10 pb-20 flex flex-col gap-8">
            {/* Search Controls Header */}
            <div className="flex flex-col gap-6 border-b border-[#4d4635]/40 pb-8">
                <div>
                    <h1 className="font-['Bodoni_Moda'] text-3xl md:text-5xl font-bold text-[#e2e2e2] flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#ffe9b0] text-4xl">search</span>
                        Browse & Search Anime
                    </h1>
                    <p className="text-sm text-[#99907c] mt-1">
                        Explore thousands of anime series, movies, and seasonal releases.
                    </p>
                </div>

                {/* Search Bar Form */}
                <form onSubmit={handleSearchSubmit} className="flex gap-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Type anime title (e.g. Solo Leveling, Bleach, Jujutsu Kaisen)..."
                            className="w-full bg-[#1E2020] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] rounded-xl pl-12 pr-4 py-3.5 text-sm md:text-base focus:outline-none focus:ring-1 focus:ring-[#ffe9b0] transition-all"
                        />
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#99907c] text-2xl">
                            search
                        </span>
                    </div>
                    <button
                        type="submit"
                        className="px-7 py-3.5 bg-[#ffe9b0] text-[#241a00] font-bold rounded-xl text-sm hover:bg-[#f2ca50] transition-colors shadow"
                    >
                        Search
                    </button>
                </form>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Genre Dropdown */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-[#99907c]">Genre:</label>
                        <select
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            className="bg-[#1E2020] border border-[#4d4635] text-[#e2e2e2] text-xs rounded-lg px-3 py-2 focus:border-[#ffe9b0] focus:outline-none"
                        >
                            <option value="">All Genres</option>
                            {genresList.map((g) => (
                                <option key={g.name} value={g.name}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Format Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-[#99907c]">Format:</label>
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="bg-[#1E2020] border border-[#4d4635] text-[#e2e2e2] text-xs rounded-lg px-3 py-2 focus:border-[#ffe9b0] focus:outline-none"
                        >
                            <option value="">All Formats</option>
                            <option value="TV">TV Series</option>
                            <option value="MOVIE">Movie</option>
                            <option value="OVA">OVA</option>
                            <option value="SPECIAL">Special</option>
                        </select>
                    </div>

                    {/* Sort Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-[#99907c]">Sort by:</label>
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="bg-[#1E2020] border border-[#4d4635] text-[#e2e2e2] text-xs rounded-lg px-3 py-2 focus:border-[#ffe9b0] focus:outline-none"
                        >
                            <option value="trending">Trending</option>
                            <option value="popular">Most Popular</option>
                            <option value="score">Highest Rated</option>
                            <option value="newest">Release Date</option>
                        </select>
                    </div>

                    {/* Reset Filters */}
                    {(query || genre || format || sort !== 'trending') && (
                        <button
                            onClick={() => {
                                setQuery('');
                                setGenre('');
                                setFormat('');
                                setSort('trending');
                            }}
                            className="text-xs text-[#ffe9b0] hover:underline ml-auto"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Results Grid */}
            <div>
                {isLoading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
                        <span className="w-12 h-12 border-3 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></span>
                        <p className="text-sm text-[#d0c5af]">Searching anime database...</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center gap-3">
                        <span className="material-symbols-outlined text-5xl text-[#ffe9b0]/40">search_off</span>
                        <h3 className="font-['Bodoni_Moda'] text-2xl text-[#e2e2e2]">No anime found</h3>
                        <p className="text-xs text-[#99907c] max-w-md">
                            Try adjusting your search query, clearing genre filters, or searching by Japanese/English titles.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                            {results.map((anime) => (
                                <AnimeCard
                                    key={anime.id}
                                    anime={anime}
                                    navigate={navigate}
                                    onWatchlistToggle={handleWatchlistToggle}
                                    isBookmarked={watchlistIds.has(anime.id)}
                                />
                            ))}
                        </div>

                        {/* Pagination Bar */}
                        <div className="flex justify-between items-center border-t border-[#4d4635]/40 pt-6">
                            <button
                                disabled={page <= 1}
                                onClick={() => performSearch(page - 1)}
                                className="px-5 py-2.5 rounded-lg bg-[#1E2020] border border-[#4d4635] text-xs font-semibold text-[#d0c5af] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#ffe9b0] hover:text-[#ffe9b0] transition-colors"
                            >
                                ← Previous Page
                            </button>

                            <span className="text-xs text-[#99907c]">
                                Page <strong className="text-[#ffe9b0]">{page}</strong>
                            </span>

                            <button
                                disabled={!pagination.hasNextPage}
                                onClick={() => performSearch(page + 1)}
                                className="px-5 py-2.5 rounded-lg bg-[#1E2020] border border-[#4d4635] text-xs font-semibold text-[#d0c5af] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#ffe9b0] hover:text-[#ffe9b0] transition-colors"
                            >
                                Next Page →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

