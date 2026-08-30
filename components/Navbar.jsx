'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AnimeApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Search, X, Bookmark, User as UserIcon, LogOut, History, Menu, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, openAuthModal } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const searchInputRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        setSuggestions(results?.results || []);
      } catch (err) {
        console.error('Failed to fetch search suggestions', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      setSuggestions([]);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectAnime = (animeId) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSuggestions([]);
    router.push(`/anime/${animeId}`);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#121414]/90 backdrop-blur-xl border-b border-white/10 transition-all">
      <div className="max-w-[1920px] mx-auto px-4 md:px-12 py-3.5 flex justify-between items-center">
        {/* Brand & Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group text-left focus:outline-none">
            <img
              src="/favicon.svg"
              alt="AnimeStop Logo"
              width={36}
              height={36}
              style={{ width: '36px', height: '36px', minWidth: '36px' }}
              className="w-9 h-9 rounded-lg shadow-[0_0_15px_rgba(255,233,176,0.35)] group-hover:scale-105 transition-transform"
            />
            <span className="font-['Bodoni_Moda'] text-2xl md:text-3xl font-bold tracking-tight text-[#ffe9b0] group-hover:text-white transition-colors">
              AnimeStop
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm tracking-wide transition-colors ${
                pathname === '/' ? 'text-[#ffe9b0] font-semibold border-b-2 border-[#ffe9b0] pb-1' : 'text-[#d0c5af] hover:text-[#ffe9b0]'
              }`}
            >
              Home
            </Link>
            <Link
              href="/search?format=TV"
              className={`text-sm tracking-wide transition-colors ${
                pathname.includes('format=TV') ? 'text-[#ffe9b0] font-semibold border-b-2 border-[#ffe9b0] pb-1' : 'text-[#d0c5af] hover:text-[#ffe9b0]'
              }`}
            >
              Series
            </Link>
            <Link
              href="/search?format=MOVIE"
              className={`text-sm tracking-wide transition-colors ${
                pathname.includes('format=MOVIE') ? 'text-[#ffe9b0] font-semibold border-b-2 border-[#ffe9b0] pb-1' : 'text-[#d0c5af] hover:text-[#ffe9b0]'
              }`}
            >
              Movies
            </Link>
            <Link
              href="/genres"
              className={`text-sm tracking-wide transition-colors ${
                pathname === '/genres' ? 'text-[#ffe9b0] font-semibold border-b-2 border-[#ffe9b0] pb-1' : 'text-[#d0c5af] hover:text-[#ffe9b0]'
              }`}
            >
              Genres
            </Link>
            <Link
              href="/library"
              className={`text-sm tracking-wide transition-colors ${
                pathname === '/library' ? 'text-[#ffe9b0] font-semibold border-b-2 border-[#ffe9b0] pb-1' : 'text-[#d0c5af] hover:text-[#ffe9b0]'
              }`}
            >
              My Library
            </Link>
          </nav>
        </div>

        {/* Right Area: Search, User Profile / Auth, Library */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Expandable Search Input (Desktop) */}
          <div className="relative hidden md:block w-56 lg:w-72" ref={searchInputRef}>
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
                <Search className="absolute left-3 text-[#99907c] w-4 h-4 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-[#99907c] hover:text-[#ffe9b0]"
                  >
                    <X className="w-4 h-4" />
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
                    No anime found for &quot;{searchQuery}&quot;
                  </div>
                )}
                {suggestions.map((anime) => (
                  <button
                    key={anime.id}
                    onClick={() => handleSelectAnime(anime.id)}
                    className="w-full p-2.5 flex items-center gap-3 hover:bg-[#282a2a] transition-colors text-left border-b border-white/5 last:border-0 cursor-pointer"
                  >
                    <img
                      src={anime.coverImage?.large || anime.coverImage?.extraLarge}
                      alt={anime.title?.english || anime.title?.romaji || 'Anime'}
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
                    className="w-full py-2.5 bg-[#282a2a] hover:bg-[#333535] text-center text-xs font-semibold text-[#ffe9b0] border-t border-white/5 transition-colors cursor-pointer"
                  >
                    View all results for &quot;{searchQuery}&quot; →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobile Search Button */}
          <Link
            href="/search"
            className="md:hidden text-[#d0c5af] hover:text-[#ffe9b0] p-2 transition-colors cursor-pointer"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </Link>

          {/* My Library Shortcut */}
          <Link
            href="/library"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#ffe9b0]/30 hover:border-[#ffe9b0] text-[#ffe9b0] text-xs font-semibold hover:bg-[#ffe9b0]/10 transition-all cursor-pointer"
            title="My Library"
          >
            <Bookmark className="w-4 h-4" />
            <span>Library</span>
          </Link>

          {/* User Authentication / Profile Menu */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-[#1E2020] hover:bg-[#282a2a] border border-[#ffe9b0]/30 hover:border-[#ffe9b0] transition-all cursor-pointer shadow-sm"
              >
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f2ca50] to-[#af8d11] text-[#241a00] font-bold text-xs flex items-center justify-center shadow">
                  {getInitials(user.name)}
                </span>
                <span className="text-xs font-semibold text-[#e2e2e2] hidden md:block max-w-[100px] truncate">
                  {user.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#99907c]" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#161818] border border-[#4d4635]/60 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1">
                  <div className="px-3 py-2 border-b border-white/5 flex flex-col">
                    <span className="text-xs font-bold text-[#e2e2e2] truncate">{user.name}</span>
                    <span className="text-[11px] text-[#99907c] truncate">{user.email}</span>
                  </div>

                  <Link
                    href="/library"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#d0c5af] hover:text-[#ffe9b0] hover:bg-[#202222] rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4 text-[#ffe9b0]" />
                    <span>Personal Watchlist</span>
                  </Link>

                  <Link
                    href="/library"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#d0c5af] hover:text-[#ffe9b0] hover:bg-[#202222] rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <History className="w-4 h-4 text-[#ffe9b0]" />
                    <span>Continue Watching</span>
                  </Link>

                  <div className="border-t border-white/5 my-1"></div>

                  <button
                    onClick={() => { setIsUserMenuOpen(false); logout(); }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('signin')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#f2ca50] to-[#af8d11] text-[#241a00] font-bold text-xs shadow-[0_0_15px_rgba(242,202,80,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-[#d0c5af] hover:text-[#ffe9b0] p-2 transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#161818] border-b border-[#4d4635]/40 px-6 py-6 flex flex-col gap-4">
          {user ? (
            <div className="p-3 rounded-xl bg-[#1E2020] border border-[#ffe9b0]/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f2ca50] to-[#af8d11] text-[#241a00] font-bold text-xs flex items-center justify-center">
                  {getInitials(user.name)}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#e2e2e2]">{user.name}</span>
                  <span className="text-[10px] text-[#99907c]">{user.email}</span>
                </div>
              </div>
              <button
                onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                className="text-xs text-red-400 font-bold hover:underline"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setIsMobileMenuOpen(false); openAuthModal('signin'); }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f2ca50] to-[#af8d11] text-[#241a00] font-bold text-xs flex items-center justify-center gap-2 shadow"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          )}

          <nav className="flex flex-col gap-3 text-sm">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-left py-2 font-semibold ${pathname === '/' ? 'text-[#ffe9b0]' : 'text-[#d0c5af]'}`}
            >
              Home
            </Link>
            <Link
              href="/search?format=TV"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-left py-2 font-semibold ${pathname.includes('format=TV') ? 'text-[#ffe9b0]' : 'text-[#d0c5af]'}`}
            >
              Series
            </Link>
            <Link
              href="/search?format=MOVIE"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-left py-2 font-semibold ${pathname.includes('format=MOVIE') ? 'text-[#ffe9b0]' : 'text-[#d0c5af]'}`}
            >
              Movies
            </Link>
            <Link
              href="/genres"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-left py-2 font-semibold ${pathname === '/genres' ? 'text-[#ffe9b0]' : 'text-[#d0c5af]'}`}
            >
              Genres
            </Link>
            <Link
              href="/library"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-left py-2 font-semibold ${pathname === '/library' ? 'text-[#ffe9b0]' : 'text-[#d0c5af]'}`}
            >
              My Library
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

