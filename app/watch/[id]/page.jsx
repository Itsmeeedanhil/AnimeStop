'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AnimeApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import VideoPlayer from '@/components/VideoPlayer';
import { Bookmark, ArrowRight, Search, X, Grid, List, Play, Music, AlertCircle } from 'lucide-react';

function PlayerContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const episodeQuery = searchParams.get('ep');
  const epNumber = parseInt(episodeQuery || '1', 10);

  const { isBookmarked, toggleBookmark } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('detail');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(0);

  const activeEpisodeRef = useRef(null);
  const batchSize = 25;

  useEffect(() => {
    const fetchStream = async () => {
      setIsLoading(true);
      try {
        const streamData = await AnimeApi.getStream(id, epNumber);
        setData(streamData);

        const currentBatchIndex = Math.floor((epNumber - 1) / batchSize);
        setSelectedBatch(currentBatchIndex);
      } catch (err) {
        console.error('Failed to load stream data', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchStream();
  }, [id, epNumber]);

  useEffect(() => {
    if (activeEpisodeRef.current) {
      activeEpisodeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [epNumber, data, selectedBatch, viewMode]);

  const handleNextEpisode = () => {
    if (data?.stream?.episodes?.some(ep => ep.number === epNumber + 1)) {
      router.push(`/watch/${id}?ep=${epNumber + 1}`);
    }
  };

  const handlePrevEpisode = () => {
    if (epNumber > 1) {
      router.push(`/watch/${id}?ep=${epNumber - 1}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
        <div className="w-12 h-12 border-4 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-[#d0c5af]">Preparing high-speed stream...</p>
      </div>
    );
  }

  if (!data?.anime) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <AlertCircle className="w-12 h-12 text-[#ffe9b0]/50" />
        <h2 className="font-['Bodoni_Moda'] text-2xl text-[#e2e2e2]">Anime Stream Unavailable</h2>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-xl bg-[#ffe9b0] text-[#241a00] font-bold text-xs hover:bg-[#f2ca50]"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const { anime, stream } = data;
  const animeTitle = anime.title?.english || anime.title?.romaji || 'Anime';
  const allEpisodes = stream?.episodes || [];
  const totalEpisodesCount = stream?.totalEpisodes || allEpisodes.length;
  const nextAiring = anime?.nextAiringEpisode;
  const isOngoing = anime?.status === 'RELEASING';
  const totalBatches = Math.max(1, Math.ceil(allEpisodes.length / batchSize));
  const bookmarked = isBookmarked(anime.id);

  const filteredEpisodes = searchQuery.trim()
    ? allEpisodes.filter(ep => ep.number.toString().includes(searchQuery.trim()))
    : allEpisodes.slice(selectedBatch * batchSize, (selectedBatch + 1) * batchSize);

  return (
    <div className="w-full flex flex-col lg:flex-row min-h-[calc(100vh-64px)] mt-14 md:mt-0 bg-[#0d0f0f]">
      {/* Left Area: Video Player + Metadata */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <VideoPlayer
          streamData={stream}
          anime={anime}
          currentEpisode={epNumber}
          onNextEpisode={handleNextEpisode}
          onPrevEpisode={handlePrevEpisode}
        />

        <div className="p-6 md:p-8 bg-[#121414] border-b border-[#4d4635]/30">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="flex flex-col gap-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#ffe9b0] text-[#241a00] font-bold text-xs">
                  Episode {epNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-[#1E2020] text-[#d0c5af] text-xs border border-white/10">
                  {anime.format || 'TV'}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                  {anime.status?.replace('_', ' ') || 'FINISHED'}
                </span>
                {isOngoing && nextAiring?.episode && (
                  <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-semibold">
                    Ep {nextAiring.episode} Airing Soon
                  </span>
                )}
              </div>

              <h1 className="font-['Bodoni_Moda'] text-2xl md:text-3xl font-bold text-[#e2e2e2]">
                {animeTitle}
              </h1>

              <p className="text-sm text-[#ffe9b0]">
                Playing Episode {epNumber} • {totalEpisodesCount} Released Episode{totalEpisodesCount === 1 ? '' : 's'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleBookmark(anime)}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                  bookmarked
                    ? 'bg-[#ffe9b0]/20 text-[#ffe9b0] border-[#ffe9b0]'
                    : 'bg-[#1E2020] text-[#e2e2e2] border-white/10 hover:bg-[#282a2a]'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
                <span>{bookmarked ? 'In Watchlist' : 'Add to List'}</span>
              </button>

              <Link
                href={`/anime/${id}`}
                className="px-4 py-2.5 rounded-xl bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-[#ffe9b0] text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <span>Overview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <p className="mt-4 text-xs md:text-sm text-[#99907c] leading-relaxed line-clamp-3">
            {anime.description?.replace(/<[^>]*>?/gm, '') || 'No synopsis available.'}
          </p>
        </div>
      </div>

      {/* Right: Episode Queue Sidebar (Optimized Desktop & Mobile Layout) */}
      <div className="w-full lg:w-[380px] xl:w-[420px] bg-[#1E2020] flex flex-col border-t lg:border-t-0 lg:border-l border-[#4d4635]/40 h-[560px] lg:h-[calc(100vh-64px)] lg:sticky lg:top-16 shrink-0 shadow-2xl">
        <div className="p-4 border-b border-[#4d4635]/30 flex flex-col gap-1 shrink-0 bg-[#1a1c1c]">
          <h2 className="font-['Bodoni_Moda'] text-lg font-bold text-[#e2e2e2] truncate">
            {animeTitle}
          </h2>
          <p className="text-xs text-[#ffe9b0] flex items-center gap-1.5">
            <span>Playing Episode {epNumber} of {totalEpisodesCount}</span>
            {isOngoing && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold uppercase">
                Released
              </span>
            )}
          </p>
        </div>

        {/* Controls */}
        <div className="p-3 bg-[#161818] border-b border-white/5 flex flex-col gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Jump to Episode #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121414] border border-[#4d4635]/50 focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-lg pl-8 pr-3 py-1.5 outline-none transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-[#99907c] absolute left-2 top-2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-[#99907c] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex bg-[#121414] rounded-lg p-0.5 border border-[#4d4635]/50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-[#ffe9b0] text-[#241a00]' : 'text-[#99907c] hover:text-[#ffe9b0]'
                }`}
                title="Compact Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('detail')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'detail' ? 'bg-[#ffe9b0] text-[#241a00]' : 'text-[#99907c] hover:text-[#ffe9b0]'
                }`}
                title="Detailed List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {totalBatches > 1 && !searchQuery && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
              {Array.from({ length: totalBatches }).map((_, idx) => {
                const from = idx * batchSize + 1;
                const to = Math.min((idx + 1) * batchSize, allEpisodes.length);
                const isCurrentBatch = selectedBatch === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedBatch(idx)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded whitespace-nowrap transition-all cursor-pointer ${
                      isCurrentBatch
                        ? 'bg-[#ffe9b0] text-[#241a00] font-bold shadow'
                        : 'bg-[#121414] text-[#d0c5af] hover:text-[#ffe9b0] border border-white/5'
                    }`}
                  >
                    {from} - {to}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Episode Queue */}
        <div className="flex-1 overflow-y-auto p-3 hide-scrollbar">
          {filteredEpisodes.length === 0 ? (
            <div className="p-8 text-center text-[#99907c] text-xs">
              No episodes found matching &quot;{searchQuery}&quot;
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {filteredEpisodes.map((ep) => {
                const isActive = ep.number === epNumber;
                return (
                  <button
                    key={ep.number}
                    ref={isActive ? activeEpisodeRef : null}
                    onClick={() => router.push(`/watch/${id}?ep=${ep.number}`)}
                    className={`h-11 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer border ${
                      isActive
                        ? 'bg-[#ffe9b0] text-[#241a00] border-[#ffe9b0] shadow-[0_0_12px_rgba(255,233,176,0.3)] scale-105'
                        : 'bg-[#121414] text-[#e2e2e2] border-white/5 hover:border-[#ffe9b0]/50 hover:bg-[#282a2a]'
                    }`}
                  >
                    <span>{ep.number}</span>
                    {isActive && (
                      <span className="text-[9px] uppercase tracking-wider font-extrabold">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredEpisodes.map((ep) => {
                const isActive = ep.number === epNumber;
                return (
                  <div
                    key={ep.number}
                    ref={isActive ? activeEpisodeRef : null}
                    onClick={() => router.push(`/watch/${id}?ep=${ep.number}`)}
                    className={`group flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#282a2a] border-[#ffe9b0] shadow-[0_0_15px_rgba(255,233,176,0.15)]'
                        : 'bg-[#161818] border-transparent hover:border-white/10 hover:bg-[#202222]'
                    }`}
                  >
                    <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-[#121414] flex-shrink-0">
                      <img
                        src={ep.thumbnail}
                        alt={`Episode ${ep.number}`}
                        className="w-full h-full object-cover"
                      />
                      {isActive ? (
                        <div className="absolute inset-0 bg-[#ffe9b0]/30 flex items-center justify-center">
                          <Music className="w-5 h-5 text-[#ffe9b0] animate-pulse" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-current" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                        isActive ? 'text-[#ffe9b0]' : 'text-[#99907c]'
                      }`}>
                        Episode {ep.number}
                      </span>
                      <h4 className={`text-xs font-semibold truncate ${
                        isActive ? 'text-white font-bold' : 'text-[#d0c5af] group-hover:text-white'
                      }`}>
                        Episode {ep.number}
                      </h4>
                      <span className="text-[10px] text-[#99907c]">24m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
          <div className="w-12 h-12 border-4 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-[#d0c5af]">Loading streaming player...</p>
        </div>
      }
    >
      <PlayerContent />
    </Suspense>
  );
}

