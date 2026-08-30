'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Play, Star, Bookmark } from 'lucide-react';

export default function AnimeCard({ anime, progress = null }) {
  const router = useRouter();
  const { isBookmarked, toggleBookmark } = useAuth();

  if (!anime) return null;

  const id = anime.id || anime.anime_id;
  const title = anime.title?.english || anime.title?.romaji || anime.title || anime.anime_title || 'Unknown Title';
  const image = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.image_url || '';
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
    const ep = progress?.episode_number || 1;
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
      className="group relative rounded-xl overflow-hidden bg-[#1E2020] border border-[#4d4635]/40 hover:border-[#ffe9b0]/60 transition-all duration-300 cursor-pointer shadow-lg flex-shrink-0 flex flex-col"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#121414]">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121414] via-[#121414]/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity"></div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={handleQuickPlay}
            className="play-btn w-12 h-12 rounded-full bg-[#ffe9b0] text-[#241a00] flex items-center justify-center shadow-[0_0_20px_rgba(255,233,176,0.6)] transform scale-75 group-hover:scale-100 hover:scale-110 transition-all"
            title="Stream Now"
          >
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </button>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center pointer-events-none">
          <span className="px-2 py-0.5 rounded bg-[#121414]/80 backdrop-blur-md border border-white/10 text-[10px] font-bold tracking-wider text-[#ffe9b0] uppercase">
            {format}
          </span>
          {score && (
            <span className="px-1.5 py-0.5 rounded bg-[#241a00]/90 backdrop-blur-md border border-[#ffe9b0]/30 text-[11px] font-bold text-[#ffe9b0] flex items-center gap-0.5 shadow">
              <Star className="w-3 h-3 fill-current text-[#ffe9b0]" />
              {score}
            </span>
          )}
        </div>

        {/* Watchlist Toggle Button */}
        <button
          onClick={handleBookmark}
          className={`bookmark-btn absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-[#121414]/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-xs transition-colors pointer-events-auto ${
            bookmarked ? 'text-[#ffe9b0] border-[#ffe9b0]' : 'text-white/70 hover:text-[#ffe9b0]'
          }`}
          title={bookmarked ? 'In Watchlist' : 'Add to Watchlist'}
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Progress Bar */}
        {progress && progress.duration_seconds > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-[#ffe9b0]"
              style={{
                width: `${Math.min(100, Math.round((progress.progress_seconds / progress.duration_seconds) * 100))}%`,
              }}
            ></div>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="p-3 flex flex-col justify-between flex-grow">
        <h3 className="text-sm font-semibold text-[#e2e2e2] group-hover:text-[#ffe9b0] transition-colors truncate">
          {title}
        </h3>
        <div className="flex justify-between items-center mt-1 text-xs text-[#99907c]">
          <span>{episodes ? `${episodes} Episodes` : 'Ongoing'}</span>
          {progress?.episode_number && (
            <span className="text-[#ffe9b0] text-[11px] font-medium">
              Ep {progress.episode_number}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

