import React, { useState, useEffect, useRef } from 'react';
import { AnimeApi } from '../services/api';

export default function Navbar({ navigate, currentRoute }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const searchInputRef = useRef(null);

    // Debounced search suggestion
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoadingSuggestions(true);
            try {
                const results = await AnimeApi.search({ q: searchQuery, per_page: 5 });
                setSuggestions(results.items || []);
            } catch (err) {
                console.error('Failed to fetch search suggestions', err);
            } finally {
                setIsLoadingSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setIsSearchOpen(false);
            setSuggestions([]);
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleSelectAnime = (animeId) => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSuggestions([]);
        navigate(`/anime/${animeId}`);
    };

    return (
        <header className="fixed top-0 left-0 w-full z-50 bg-[#121414]/90 backdrop-blur-xl border-b border-white/10 transition-all">
            <div className="max-w-[1920px] mx-auto px-4 md:px-12 py-3.5 flex justify-between items-center">
                {/* Brand & Nav */}
                <div className="flex items-center gap-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2.5 group text-left focus:outline-none"
                    >
                        <img
                            src="/favicon.svg"
                            alt="AnimeStop Logo"
                            className="w-9 h-9 rounded-lg shadow-[0_0_15px_rgba(255,233,176,0.35)] group-hover:scale-105 transition-transform"
                        />
                        <div className="flex flex-col">
                            <span className="font-['Bodoni_Moda'] text-2xl md:text-3xl font-bold tracking-tight text-[#ffe9b0] group-hover:text-white transition-colors">
                                AnimeStop
                            </span>
                        </div>
                    </button>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden lg:flex items-center gap-6">
                        <button
                            onClick={() => navigate('/')}
                            className={`font-['Hanken_Grotesk'] text-sm tracking-wide transition-colors ${
                                currentRoute === '/' ? 'text-[#ffe9b0] font-semibold border-b-2 border-[#ffe9b0] pb-1' : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                            }`}
                        >
                            Home
                        </button>
                        <button
                            onClick={() => navigate('/search?format=TV')}
                            className={`font-['Hanken_Grotesk'] text-sm tracking-wide transition-colors ${
                                currentRoute.includes('format=TV') ? 'text-[#ffe9b0] font-semibold border-b-2 border-[#ffe9b0] pb-1' : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                            }`}
                        >
                            Series
                        </button>
                        <button
                            onClick={() => navigate('/search?format=MOVIE')}
                            className={`font-['Hanken_Grotesk'] text-sm tracking-wide transition-colors ${
                                currentRoute.includes('format=MOVIE') ? 'text-[#ffe9b0] font-semibold border-b-2 border-[#ffe9b0] pb-1' : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                            }`}
                        >
                            Movies
                        </button>
                        <button
                            onClick={() => navigate('/genres')}
                            className={`font-['Hanken_Grotesk'] text-sm tracking-wide transition-colors ${
                                currentRoute === '/genres' ? 'text-[#ffe9b0] font-semibold border-b-2 border-[#ffe9b0] pb-1' : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                            }`}
                        >
                            Genres
                        </button>
                        <button
                            onClick={() => navigate('/library')}
                            className={`font-['Hanken_Grotesk'] text-sm tracking-wide transition-colors ${
                                currentRoute === '/library' ? 'text-[#ffe9b0] font-semibold border-b-2 border-[#ffe9b0] pb-1' : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                            }`}
                        >
                            My Library
                        </button>
                    </nav>
                </div>

                {/* Right Actions: Search, Notifications, Library */}
                <div className="flex items-center gap-4">
                    {/* Live Search Input (Desktop) */}
                    <div className="relative hidden md:block w-64 lg:w-80">
                        <form onSubmit={handleSearchSubmit}>
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    placeholder="Search anime, genres, studios..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchOpen(true)}
                                    className="w-full bg-[#1a1c1c] border border-[#4d4635]/60 focus:border-[#ffe9b0] text-[#e2e2e2] text-xs md:text-sm rounded-full pl-10 pr-4 py-2 placeholder-[#99907c] focus:outline-none focus:ring-1 focus:ring-[#ffe9b0] transition-all"
                                />
                                <span className="material-symbols-outlined absolute left-3 text-[#99907c] text-lg pointer-events-none">
                                    search
                                </span>
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 text-[#99907c] hover:text-[#ffe9b0]"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                )}
                            </div>
                        </form>

                        {/* Search Dropdown / Autocomplete */}
                        {isSearchOpen && (searchQuery.trim().length >= 2 || suggestions.length > 0) && (
                            <div className="absolute top-full mt-2 left-0 right-0 bg-[#1E2020] border border-[#4d4635] rounded-xl shadow-2xl overflow-hidden z-50">
                                {isLoadingSuggestions && (
                                    <div className="p-3 text-center text-xs text-[#99907c]">
                                        Searching anime archives...
                                    </div>
                                )}
                                {!isLoadingSuggestions && suggestions.length === 0 && searchQuery.trim().length >= 2 && (
                                    <div className="p-4 text-center text-xs text-[#99907c]">
                                        No anime found for "{searchQuery}"
                                    </div>
                                )}
                                {suggestions.map((anime) => (
                                    <button
                                        key={anime.id}
                                        onClick={() => handleSelectAnime(anime.id)}
                                        className="w-full p-2.5 flex items-center gap-3 hover:bg-[#282a2a] transition-colors text-left border-b border-white/5 last:border-0"
                                    >
                                        <img
                                            src={anime.coverImage?.large || anime.coverImage?.extraLarge}
                                            alt={anime.title?.english || anime.title?.romaji}
                                            className="w-10 h-14 object-cover rounded bg-[#121414] flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[#e2e2e2] font-semibold truncate">
                                                {anime.title?.english || anime.title?.romaji}
                                            </p>
                                            <p className="text-xs text-[#99907c] truncate mt-0.5">
                                                {anime.format || 'TV'} • {anime.episodes ? `${anime.episodes} eps` : 'Ongoing'} • ★ {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A'}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                                {suggestions.length > 0 && (
                                    <button
                                        onClick={handleSearchSubmit}
                                        className="w-full py-2.5 bg-[#282a2a] hover:bg-[#333535] text-center text-xs font-semibold text-[#ffe9b0] border-t border-white/5 transition-colors"
                                    >
                                        View all results for "{searchQuery}" →
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mobile Search Button */}
                    <button
                        onClick={() => navigate('/search')}
                        className="md:hidden text-[#d0c5af] hover:text-[#ffe9b0] p-2 transition-colors"
                        title="Search"
                    >
                        <span className="material-symbols-outlined text-2xl">search</span>
                    </button>

                    {/* My Library Shortcut */}
                    <button
                        onClick={() => navigate('/library')}
                        className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#ffe9b0]/30 hover:border-[#ffe9b0] text-[#ffe9b0] text-xs font-semibold hover:bg-[#ffe9b0]/10 transition-all"
                        title="My Library"
                    >
                        <span className="material-symbols-outlined text-base">bookmark</span>
                        <span>Library</span>
                    </button>

                    {/* Mobile Hamburger Toggle */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="lg:hidden text-[#d0c5af] hover:text-[#ffe9b0] p-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">
                            {isMobileMenuOpen ? 'close' : 'menu'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            {isMobileMenuOpen && (
                <div className="lg:hidden bg-[#1E2020] border-b border-[#4d4635] px-6 py-4 flex flex-col gap-3">
                    <button
                        onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}
                        className="flex items-center gap-3 py-2 text-[#e2e2e2] hover:text-[#ffe9b0] text-sm font-medium"
                    >
                        <span className="material-symbols-outlined text-xl text-[#ffe9b0]">home</span>
                        <span>Home</span>
                    </button>
                    <button
                        onClick={() => { navigate('/search?format=TV'); setIsMobileMenuOpen(false); }}
                        className="flex items-center gap-3 py-2 text-[#e2e2e2] hover:text-[#ffe9b0] text-sm font-medium"
                    >
                        <span className="material-symbols-outlined text-xl text-[#ffe9b0]">tv</span>
                        <span>Anime Series</span>
                    </button>
                    <button
                        onClick={() => { navigate('/search?format=MOVIE'); setIsMobileMenuOpen(false); }}
                        className="flex items-center gap-3 py-2 text-[#e2e2e2] hover:text-[#ffe9b0] text-sm font-medium"
                    >
                        <span className="material-symbols-outlined text-xl text-[#ffe9b0]">movie</span>
                        <span>Anime Movies</span>
                    </button>
                    <button
                        onClick={() => { navigate('/genres'); setIsMobileMenuOpen(false); }}
                        className="flex items-center gap-3 py-2 text-[#e2e2e2] hover:text-[#ffe9b0] text-sm font-medium"
                    >
                        <span className="material-symbols-outlined text-xl text-[#ffe9b0]">category</span>
                        <span>Browse Genres</span>
                    </button>
                    <button
                        onClick={() => { navigate('/library'); setIsMobileMenuOpen(false); }}
                        className="flex items-center gap-3 py-2 text-[#e2e2e2] hover:text-[#ffe9b0] text-sm font-medium"
                    >
                        <span className="material-symbols-outlined text-xl text-[#ffe9b0]">video_library</span>
                        <span>My Library & Watchlist</span>
                    </button>
                </div>
            )}
        </header>
    );
}

