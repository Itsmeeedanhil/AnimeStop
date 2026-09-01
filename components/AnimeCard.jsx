'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getLastWatchedEpisode } from '@/lib/api';
import { Play, Star, Bookmark } from 'lucide-react';

export default function AnimeCard({ anime, progress = null }) {
  const router = useRouter();
  const { isBookmarked, toggleBookmark } = useAuth();

  if (!anime) return null;

  // Prioritize anime_id (AniList ID) over table primary key id
  const id = anime.anime_id || anime.id;
  const title = anime.title?.english || anime.title?.romaji || (typeof anime.title === 'string' ? anime.title : null) || anime.anime_title || 'Unknown Title';
  const image = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.image_url || anime.anime_image || '';
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : (anime.score ? Number(anime.score).toFixed(1) : null);
  const episodes = anime.episodes || anime.episodes_count;
  const format = anime.format || 'TV';
  const bookmarked = isBookmarked(id);

  const handleCardClick = (e) => {
    if (e.target.closest('.play-btn') || e.target.closest('.bookmark-btn')) return;
    router.push(`/anime/${id}`);
  };

  const handleQuickPlay = (e) => {
    e.stopPropagation();
    const ep = progress?.episode_number || getLastWatchedEpisode(id) || 1;
    router.push(`/watch/${id}?ep=${ep}`);
  };

  const handleBookmark = async (e) => {
    e.stopPropagation();
    try {
      await toggleBookmark(anime);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative w-full max-w-[200px] rounded-xl overflow-hidden bg-[#1E2020] border border-[#4d4635]/40 hover:border-[#ffe9b0]/60 transition-all duration-300 cursor-pointer shadow-md hover:shadow-xl flex flex-col mx-auto"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#121414]">
        <img
          src={image || anime?.banner_url || anime?.bannerImage || '/favicon.svg'}
          alt={title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = anime?.banner_url || anime?.bannerImage || '/favicon.svg';
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121414] via-[#121414]/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={handleQuickPlay}
            className="play-btn w-10 h-10 rounded-full bg-[#ffe9b0] text-[#241a00] flex items-center justify-center shadow-[0_0_15px_rgba(255,233,176,0.6)] transform scale-75 group-hover:scale-100 hover:scale-110 transition-all"
            title="Stream Now"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-center pointer-events-none">
          <span className="px-1.5 py-0.5 rounded bg-[#121414]/80 backdrop-blur-md border border-white/10 text-[9px] font-bold tracking-wider text-[#ffe9b0] uppercase">
            {format}
          </span>
          {score && (
            <span className="px-1.5 py-0.5 rounded bg-[#241a00]/90 backdrop-blur-md border border-[#ffe9b0]/30 text-[10px] font-bold text-[#ffe9b0] flex items-center gap-0.5 shadow">
              <Star className="w-2.5 h-2.5 fill-current text-[#ffe9b0]" />
              {score}
            </span>
          )}
        </div>

        {/* Watchlist Toggle Button */}
        <button
          onClick={handleBookmark}
          className={`bookmark-btn absolute top-2 right-2 w-7 h-7 rounded-full bg-[#121414]/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-xs transition-colors pointer-events-auto ${
            bookmarked ? 'text-[#ffe9b0] border-[#ffe9b0]' : 'text-white/70 hover:text-[#ffe9b0]'
          }`}
          title={bookmarked ? 'In Watchlist' : 'Add to Watchlist'}
        >
          <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Progress Bar */}
        {progress && (progress.duration_seconds > 0 || progress.progress_seconds > 0) && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-gradient-to-r from-[#f2ca50] to-[#af8d11]"
              style={{
                width: `${Math.min(100, Math.max(5, Math.round(((progress.progress_seconds || 15) / (progress.duration_seconds || 1440)) * 100)))}%`,
              }}
            ></div>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="p-2.5 flex flex-col justify-between flex-grow">
        <h3 className="text-xs font-semibold text-[#e2e2e2] group-hover:text-[#ffe9b0] transition-colors truncate leading-tight">
          {title}
        </h3>
        <div className="flex justify-between items-center mt-1 text-[11px] text-[#99907c]">
          <span>{episodes ? `${episodes} Ep` : 'Ongoing'}</span>
          {progress?.episode_number && (
            <span className="text-[#ffe9b0] text-[10px] font-bold bg-[#ffe9b0]/10 px-1 py-0.2 rounded">
              Ep {progress.episode_number}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
