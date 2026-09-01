'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimeApi, LibraryApi, getLastWatchedEpisode } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AnimeCard from '@/components/AnimeCard';
import { Analytics } from "@vercel/analytics/next"
import {
  Play,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flame,
  Tv,
  Star,
  Sparkles,
  Info,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isBookmarked, toggleBookmark } = useAuth();

  const [feed, setFeed] = useState(null);
  const [continueWatching, setContinueWatching] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('trending');

  // Load home feed and continue watching queue
  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [homeFeed, libraryData] = await Promise.all([
          AnimeApi.getHome(),
          LibraryApi.getLibrary().catch(() => ({ continueWatching: [] })),
        ]);

        setFeed(homeFeed);
        setContinueWatching(libraryData?.continueWatching || []);
      } catch (err) {
        console.error('Failed to load home page feed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();

    const handleUpdate = () => {
      LibraryApi.getLibrary().then(lib => {
        setContinueWatching(lib?.continueWatching || []);
      }).catch(() => {});
    };

    window.addEventListener('animestop_library_updated', handleUpdate);
    return () => window.removeEventListener('animestop_library_updated', handleUpdate);
  }, []);

  // Auto-rotate hero spotlight every 7 seconds
  useEffect(() => {
    if (!feed?.spotlight || feed.spotlight.length <= 1) return;

    const interval = setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % feed.spotlight.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [feed]);

  const scrollRow = (rowId, direction) => {
    const row = document.getElementById(rowId);
    if (row) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
        <div className="w-12 h-12 border-4 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-[#d0c5af]">Preparing curated anime stream...</p>
      </div>
    );
  }

  const heroAnime = feed?.spotlight?.[activeHeroIndex] || feed?.spotlight?.[0];
  const heroTitle = heroAnime?.title?.english || heroAnime?.title?.romaji || 'Featured Anime';
  const isHeroBookmarked = heroAnime ? isBookmarked(heroAnime.id) : false;

  return (
    <div className="w-full flex flex-col pb-20 overflow-x-hidden">
      {/* Dynamic Hero Spotlight Banner */}
      {heroAnime && (
        <section className="relative w-full h-[65vh] md:h-[75vh] min-h-[460px] max-h-[750px] overflow-hidden">
          {/* Background Poster/Banner Image with Dual Luxury Vignette Gradients */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105"
            style={{
              backgroundImage: `url(${heroAnime.bannerImage || heroAnime.coverImage?.extraLarge || heroAnime.coverImage?.large})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#121414] via-[#121414]/70 to-black/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121414] via-[#121414]/80 to-transparent" />
          </div>

          {/* Hero Content Overlay */}
          <div className="relative z-10 h-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-16 flex flex-col justify-end pb-10 md:pb-16 max-w-3xl">
            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#ffe9b0] text-[#241a00] text-[11px] sm:text-xs font-extrabold uppercase tracking-wider">
                Spotlight #{activeHeroIndex + 1}
              </span>
              <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#1E2020]/80 backdrop-blur-md border border-white/10 text-[11px] sm:text-xs font-semibold text-[#e2e2e2]">
                {heroAnime.format || 'TV'}
              </span>
              {heroAnime.genres?.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#1E2020]/60 backdrop-blur-md border border-white/10 text-[11px] sm:text-xs text-[#d0c5af]"
                >
                  {g}
                </span>
              ))}
              {heroAnime.episodes && (
                <span className="text-[11px] sm:text-xs text-[#99907c] font-medium ml-1">
                  {heroAnime.episodes} Eps • {heroAnime.seasonYear || '2024'}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-['Bodoni_Moda'] text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#e2e2e2] mb-2 sm:mb-3 leading-tight drop-shadow-md">
              {heroTitle}
            </h1>

            {/* Description */}
            <p className="text-xs sm:text-sm md:text-base text-[#d0c5af] mb-4 sm:mb-6 drop-shadow max-w-2xl line-clamp-2 sm:line-clamp-3 leading-relaxed">
              {heroAnime.description?.replace(/<[^>]*>?/gm, '') || 'Step into an epic anime journey filled with high-stakes battles, profound mysteries, and unforgettable companions.'}
            </p>

            {/* Hero CTA Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => {
                  const lastEp = getLastWatchedEpisode(heroAnime.id);
                  router.push(`/watch/${heroAnime.id}?ep=${lastEp}`);
                }}
                className="bg-[#ffe9b0] text-[#241a00] text-xs sm:text-sm md:text-base font-bold px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl flex items-center gap-2 hover:bg-[#f2ca50] transition-all shadow-[0_0_20px_rgba(255,233,176,0.4)] transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                <span>
                  {typeof window !== 'undefined' && getLastWatchedEpisode(heroAnime.id) > 1
                    ? `Resume Episode ${getLastWatchedEpisode(heroAnime.id)}`
                    : 'Stream Episode 1'}
                </span>
              </button>

              <button
                onClick={() => toggleBookmark(heroAnime)}
                className={`px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 backdrop-blur-md border transition-all cursor-pointer ${
                  isHeroBookmarked
                    ? 'bg-[#ffe9b0]/20 border-[#ffe9b0] text-[#ffe9b0]'
                    : 'bg-[#1E2020]/70 border-white/20 text-[#e2e2e2] hover:bg-[#1E2020] hover:border-[#ffe9b0]/50'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isHeroBookmarked ? 'fill-current' : ''}`} />
                {isHeroBookmarked ? 'In Watchlist' : 'Add to List'}
              </button>

              <Link
                href={`/anime/${heroAnime.id}`}
                className="px-3.5 sm:px-5 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-semibold text-[#d0c5af] hover:text-white bg-[#121414]/60 border border-white/10 hover:bg-[#121414] transition-all flex items-center gap-1.5"
              >
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Overview</span>
              </Link>
            </div>
          </div>

          {/* Hero Slide Dots */}
          {feed.spotlight?.length > 1 && (
            <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-16 z-20 flex gap-1.5 sm:gap-2">
              {feed.spotlight.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveHeroIndex(idx)}
                  className={`h-1.5 sm:h-2 rounded-full transition-all ${
                    idx === activeHeroIndex ? 'w-6 sm:w-8 bg-[#ffe9b0]' : 'w-1.5 sm:w-2 bg-white/30 hover:bg-white/60'
                  }`}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Quick Filter Category Chips */}
      <section className="px-4 sm:px-8 md:px-16 pt-6 sm:pt-8 pb-3 sm:pb-4">
        <div className="flex gap-2 sm:gap-2.5 overflow-x-auto hide-scrollbar pb-2">
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
                  router.push(`/search?genre=${cat.id}`);
                }
              }}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
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

      {/* Continue Watching Shelf (Compact 16:9 Landscape Cards) */}
      {continueWatching.length > 0 && (
        <section className="py-4 sm:py-6 px-4 sm:px-8 md:px-16">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="font-['Bodoni_Moda'] text-xl sm:text-2xl md:text-3xl font-bold text-[#e2e2e2] flex items-center gap-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffe9b0]" />
              Continue Watching
            </h2>
            <Link href="/library" className="text-xs font-semibold text-[#ffe9b0] hover:underline">
              View All History →
            </Link>
          </div>

          <div className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar pb-3 sm:pb-4 snap-x scroll-smooth">
            {continueWatching.map((item) => {
              const percent = Math.min(100, Math.round(((item.progress_seconds || 15) / (item.duration_seconds || 1440)) * 100));
              return (
                <div
                  key={item.id || item.anime_id}
                  onClick={() => router.push(`/watch/${item.anime_id}?ep=${item.episode_number}`)}
                  className="group relative w-[220px] sm:w-[270px] shrink-0 snap-start rounded-xl bg-[#1E2020] border border-[#4d4635]/40 hover:border-[#ffe9b0]/70 overflow-hidden transition-all duration-300 shadow-md hover:shadow-xl cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-[#121414]">
                    <img
                      src={item.anime_image || item.anime_banner}
                      alt={item.anime_title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-[#ffe9b0]">
                      Ep {item.episode_number}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#ffe9b0] text-[#241a00] flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                      </span>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div
                        className="h-full bg-gradient-to-r from-[#f2ca50] to-[#af8d11]"
                        style={{ width: `${Math.max(5, percent)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 flex flex-col gap-0.5">
                    <h4 className="text-xs font-semibold text-[#e2e2e2] group-hover:text-[#ffe9b0] transition-colors truncate">
                      {item.anime_title}
                    </h4>
                    <div className="flex justify-between text-[10px] sm:text-[11px] text-[#99907c]">
                      <span>Episode {item.episode_number}</span>
                      <span>{percent}% watched</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Carousel 1: Trending Now */}
      <section className="py-4 sm:py-6 px-4 sm:px-8 md:px-16">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="font-['Bodoni_Moda'] text-xl sm:text-2xl md:text-3xl font-bold text-[#e2e2e2] flex items-center gap-2">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffe9b0]" />
            Trending Now
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollRow('trending-row', 'left')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => scrollRow('trending-row', 'right')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        <div id="trending-row" className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar pb-3 sm:pb-4 snap-x scroll-smooth">
          {feed?.trending?.map((anime) => (
            <div key={anime.id} className="w-[130px] sm:w-[160px] md:w-[180px] shrink-0 snap-start">
              <AnimeCard anime={anime} />
            </div>
          ))}
        </div>
      </section>

      {/* Carousel 2: Top Airing Series */}
      <section className="py-4 sm:py-6 px-4 sm:px-8 md:px-16">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="font-['Bodoni_Moda'] text-xl sm:text-2xl md:text-3xl font-bold text-[#e2e2e2] flex items-center gap-2">
            <Tv className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffe9b0]" />
            Top Airing This Season
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollRow('airing-row', 'left')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => scrollRow('airing-row', 'right')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        <div id="airing-row" className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar pb-3 sm:pb-4 snap-x scroll-smooth">
          {feed?.topAiring?.map((anime) => (
            <div key={anime.id} className="w-[130px] sm:w-[160px] md:w-[180px] shrink-0 snap-start">
              <AnimeCard anime={anime} />
            </div>
          ))}
        </div>
      </section>

      {/* Carousel 3: Most Popular All-Time */}
      <section className="py-4 sm:py-6 px-4 sm:px-8 md:px-16">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="font-['Bodoni_Moda'] text-xl sm:text-2xl md:text-3xl font-bold text-[#e2e2e2] flex items-center gap-2">
            <Star className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffe9b0]" />
            Most Popular of All Time
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollRow('popular-row', 'left')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => scrollRow('popular-row', 'right')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        <div id="popular-row" className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar pb-3 sm:pb-4 snap-x scroll-smooth">
          {feed?.popular?.map((anime) => (
            <div key={anime.id} className="w-[130px] sm:w-[160px] md:w-[180px] shrink-0 snap-start">
              <AnimeCard anime={anime} />
            </div>
          ))}
        </div>
        <Analytics />
      </section>
    </div>
  );
}
