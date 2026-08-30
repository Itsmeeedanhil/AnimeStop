import React, { useState, useEffect, useRef } from 'react';
import { AnimeApi, LibraryApi } from '../services/api';
import AnimeCard from '../components/AnimeCard';

export default function HomePage({ navigate, showNotification }) {
    const [feed, setFeed] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeHeroIndex, setActiveHeroIndex] = useState(0);
    const [activeCategoryFilter, setActiveCategoryFilter] = useState('trending');
    const [watchlistIds, setWatchlistIds] = useState(new Set());

    useEffect(() => {
        const loadHomeData = async () => {
            try {
                const data = await AnimeApi.getHome();
                setFeed(data);

                // Load user watchlist IDs
                const lib = await LibraryApi.getLibrary();
                const ids = new Set((lib.watchlist || []).map(w => w.anime_id));
                setWatchlistIds(ids);
            } catch (err) {
                console.error('Failed to load home feed', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadHomeData();
    }, []);

    // Auto rotate hero spotlight every 8 seconds
    useEffect(() => {
        if (!feed?.spotlight?.length) return;
        const interval = setInterval(() => {
            setActiveHeroIndex((prev) => (prev + 1) % feed.spotlight.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [feed?.spotlight]);

    const handleWatchlistToggle = async (anime) => {
        try {
            const res = await LibraryApi.toggleWatchlist(anime);
            setWatchlistIds((prev) => {
                const next = new Set(prev);
                if (res.isBookmarked) {
                    next.add(anime.id);
                    if (showNotification) showNotification(`Added "${anime.title?.english || anime.title?.romaji}" to Watchlist`);
                } else {
                    next.delete(anime.id);
                    if (showNotification) showNotification(`Removed from Watchlist`);
                }
                return next;
            });
        } catch (err) {
            console.error('Watchlist toggle failed', err);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
                <span className="w-12 h-12 border-3 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></span>
                <p className="text-sm font-['Hanken_Grotesk'] text-[#d0c5af] animate-pulse">Loading AnimeStop feed...</p>
            </div>
        );
    }

    const heroAnime = feed?.spotlight?.[activeHeroIndex] || feed?.spotlight?.[0];
    const heroTitle = heroAnime?.title?.english || heroAnime?.title?.romaji || 'Featured Anime';
    const heroScore = heroAnime?.averageScore ? (heroAnime.averageScore / 10).toFixed(1) : '9.0';
    const heroBanner = heroAnime?.bannerImage || heroAnime?.coverImage?.extraLarge;
    const isHeroBookmarked = heroAnime ? watchlistIds.has(heroAnime.id) : false;

    // Helper for horizontal carousel scroll
    const scrollRow = (elementId, direction) => {
        const el = document.getElementById(elementId);
        if (el) {
            el.scrollBy({ left: direction === 'left' ? -600 : 600, behavior: 'smooth' });
        }
    };

    return (
        <div className="w-full flex flex-col pb-16">
            {/* Dynamic Hero Section */}
            {heroAnime && (
                <section className="relative w-full h-[75vh] min-h-[520px] max-h-[720px] flex items-end pb-12 px-6 md:px-16 overflow-hidden group">
                    {/* Background Banner with zoom animation */}
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-100 group-hover:scale-105"
                        style={{ backgroundImage: `url(${heroBanner})` }}
                    ></div>

                    {/* Gradient Overlays matching mockup */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121414] via-[#121414]/60 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#121414] via-[#121414]/50 to-transparent"></div>

                    {/* Hero Content Overlay */}
                    <div className="relative z-10 max-w-3xl flex flex-col">
                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center gap-2.5 mb-3">
                            <span className="px-2.5 py-1 bg-[#121414]/80 backdrop-blur-md rounded border border-[#ffe9b0]/30 text-[11px] font-bold text-[#ffe9b0] uppercase tracking-wider">
                                {heroAnime.format || 'TV Series'}
                            </span>
                            <span className="px-2.5 py-1 bg-[#121414]/80 backdrop-blur-md rounded border border-white/10 text-[11px] font-semibold text-[#e2e2e2] flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-[#ffe9b0]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    star
                                </span>
                                {heroScore} Rating
                            </span>
                            {heroAnime.episodes && (
                                <span className="text-xs text-[#d0c5af]">
                                    {heroAnime.episodes} Episodes • {heroAnime.seasonYear || '2024'}
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="font-['Bodoni_Moda'] text-3xl md:text-5xl lg:text-6xl font-bold text-[#e2e2e2] mb-3 leading-tight drop-shadow-md">
                            {heroTitle}
                        </h1>

                        {/* Description */}
                        <p className="font-['Hanken_Grotesk'] text-sm md:text-base text-[#d0c5af] mb-6 drop-shadow max-w-2xl line-clamp-3 leading-relaxed">
                            {heroAnime.description || 'Step into an epic anime journey filled with high-stakes battles, profound mysteries, and unforgettable companions.'}
                        </p>

                        {/* Hero Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => navigate(`/watch/${heroAnime.id}/1`)}
                                className="bg-[#ffe9b0] text-[#241a00] font-['Hanken_Grotesk'] text-sm md:text-base font-bold px-7 py-3.5 rounded-xl flex items-center gap-2 hover:bg-[#f2ca50] transition-all shadow-[0_0_20px_rgba(255,233,176,0.4)] transform hover:scale-105 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-2xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    play_arrow
                                </span>
                                Stream Episode 1
                            </button>

                            <button
                                onClick={() => handleWatchlistToggle(heroAnime)}
                                className={`px-6 py-3.5 rounded-xl font-['Hanken_Grotesk'] text-sm font-semibold flex items-center gap-2 backdrop-blur-md border transition-all cursor-pointer ${
                                    isHeroBookmarked
                                        ? 'bg-[#ffe9b0]/20 border-[#ffe9b0] text-[#ffe9b0]'
                                        : 'bg-[#1E2020]/70 border-white/20 text-[#e2e2e2] hover:bg-[#1E2020] hover:border-[#ffe9b0]/50'
                                }`}
                            >
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: isHeroBookmarked ? "'FILL' 1" : "'FILL' 0" }}>
                                    {isHeroBookmarked ? 'bookmark_added' : 'bookmark_add'}
                                </span>
                                {isHeroBookmarked ? 'In Watchlist' : 'Add to List'}
                            </button>

                            <button
                                onClick={() => navigate(`/anime/${heroAnime.id}`)}
                                className="px-5 py-3.5 rounded-xl font-['Hanken_Grotesk'] text-sm font-semibold text-[#d0c5af] hover:text-white bg-[#121414]/60 border border-white/10 hover:bg-[#121414] transition-all"
                            >
                                Overview
                            </button>
                        </div>
                    </div>

                    {/* Hero Slide Dots */}
                    {feed.spotlight?.length > 1 && (
                        <div className="absolute bottom-6 right-6 md:right-16 z-20 flex gap-2">
                            {feed.spotlight.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveHeroIndex(idx)}
                                    className={`h-2 rounded-full transition-all ${
                                        idx === activeHeroIndex ? 'w-8 bg-[#ffe9b0]' : 'w-2 bg-white/30 hover:bg-white/60'
                                    }`}
                                    title={`Slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Quick Filter Category Chips */}
            <section className="px-6 md:px-16 pt-8 pb-4">
                <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2">
                    {[
                        { id: 'trending', label: 'Trending' },
                        { id: 'airing', label: 'Top Airing' },
                        { id: 'popular', label: 'All-Time Popular' },
                        { id: 'Action', label: 'Action & Shonen' },
                        { id: 'Fantasy', label: 'Fantasy & Isekai' },
                        { id: 'Romance', label: 'Romance & Drama' },
                        { id: 'Sci-Fi', label: 'Sci-Fi & Cyberpunk' },
                    ].map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setActiveCategoryFilter(cat.id);
                                if (cat.id !== 'trending' && cat.id !== 'airing' && cat.id !== 'popular') {
                                    navigate(`/search?genre=${cat.id}`);
                                }
                            }}
                            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                activeCategoryFilter === cat.id
                                    ? 'bg-[#ffe9b0] text-[#241a00] shadow-[0_0_15px_rgba(255,233,176,0.3)]'
                                    : 'bg-[#1E2020] text-[#d0c5af] border border-[#4d4635]/50 hover:border-[#ffe9b0]/50 hover:text-[#ffe9b0]'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Carousel 1: Trending Now */}
            <section className="py-6 px-6 md:px-16">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-['Bodoni_Moda'] text-2xl md:text-3xl font-bold text-[#e2e2e2] flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#ffe9b0] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            local_fire_department
                        </span>
                        Trending Now
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => scrollRow('trending-row', 'left')}
                            className="w-9 h-9 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                        </button>
                        <button
                            onClick={() => scrollRow('trending-row', 'right')}
                            className="w-9 h-9 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                        </button>
                    </div>
                </div>

                <div
                    id="trending-row"
                    className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x scroll-smooth"
                >
                    {feed?.trending?.map((anime) => (
                        <div key={anime.id} className="min-w-[160px] sm:min-w-[190px] md:min-w-[220px] snap-start">
                            <AnimeCard
                                anime={anime}
                                navigate={navigate}
                                onWatchlistToggle={handleWatchlistToggle}
                                isBookmarked={watchlistIds.has(anime.id)}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Carousel 2: Top Airing Series */}
            <section className="py-6 px-6 md:px-16">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-['Bodoni_Moda'] text-2xl md:text-3xl font-bold text-[#e2e2e2] flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#ffe9b0] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            live_tv
                        </span>
                        Top Airing This Season
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => scrollRow('airing-row', 'left')}
                            className="w-9 h-9 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                        </button>
                        <button
                            onClick={() => scrollRow('airing-row', 'right')}
                            className="w-9 h-9 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                        </button>
                    </div>
                </div>

                <div
                    id="airing-row"
                    className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x scroll-smooth"
                >
                    {feed?.topAiring?.map((anime) => (
                        <div key={anime.id} className="min-w-[160px] sm:min-w-[190px] md:min-w-[220px] snap-start">
                            <AnimeCard
                                anime={anime}
                                navigate={navigate}
                                onWatchlistToggle={handleWatchlistToggle}
                                isBookmarked={watchlistIds.has(anime.id)}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Carousel 3: Most Popular All-Time */}
            <section className="py-6 px-6 md:px-16">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-['Bodoni_Moda'] text-2xl md:text-3xl font-bold text-[#e2e2e2] flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#ffe9b0] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            stars
                        </span>
                        Most Popular of All Time
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => scrollRow('popular-row', 'left')}
                            className="w-9 h-9 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                        </button>
                        <button
                            onClick={() => scrollRow('popular-row', 'right')}
                            className="w-9 h-9 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                        </button>
                    </div>
                </div>

                <div
                    id="popular-row"
                    className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x scroll-smooth"
                >
                    {feed?.popularAllTime?.map((anime) => (
                        <div key={anime.id} className="min-w-[160px] sm:min-w-[190px] md:min-w-[220px] snap-start">
                            <AnimeCard
                                anime={anime}
                                navigate={navigate}
                                onWatchlistToggle={handleWatchlistToggle}
                                isBookmarked={watchlistIds.has(anime.id)}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Carousel 4: Action Highlights */}
            {feed?.actionHighlights?.length > 0 && (
                <section className="py-6 px-6 md:px-16">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-['Bodoni_Moda'] text-2xl md:text-3xl font-bold text-[#e2e2e2] flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-[#ffe9b0] text-3xl">sports_kabaddi</span>
                            Action & High Stakes
                        </h2>
                        <button
                            onClick={() => navigate('/search?genre=Action')}
                            className="text-xs font-semibold text-[#ffe9b0] hover:underline"
                        >
                            View All →
                        </button>
                    </div>

                    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x scroll-smooth">
                        {feed.actionHighlights.map((anime) => (
                            <div key={anime.id} className="min-w-[160px] sm:min-w-[190px] md:min-w-[220px] snap-start">
                                <AnimeCard
                                    anime={anime}
                                    navigate={navigate}
                                    onWatchlistToggle={handleWatchlistToggle}
                                    isBookmarked={watchlistIds.has(anime.id)}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

