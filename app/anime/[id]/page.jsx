'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { AnimeApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AnimeCard from '@/components/AnimeCard';
import { Play, Bookmark, Film, Star, Grid, List, Search, X, Clock, PlayCircle, AlertCircle } from 'lucide-react';

export default function DetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const { isBookmarked, toggleBookmark } = useAuth();

  const [anime, setAnime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('detail');

  useEffect(() => {
    const fetchAnime = async () => {
      setIsLoading(true);
      try {
        const data = await AnimeApi.getDetails(id);
        setAnime(data);
      } catch (err) {
        console.error('Failed to load anime details', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchAnime();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
        <div className="w-12 h-12 border-4 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-[#d0c5af]">Fetching anime metadata...</p>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <AlertCircle className="w-12 h-12 text-[#ffe9b0]/50" />
        <h2 className="font-['Bodoni_Moda'] text-2xl text-[#e2e2e2]">Anime Not Found</h2>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-xl bg-[#ffe9b0] text-[#241a00] font-bold text-xs hover:bg-[#f2ca50]"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const title = anime.title?.english || anime.title?.romaji || 'Anime Details';
  const romaji = anime.title?.romaji;
  const native = anime.title?.native;
  const banner = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large;
  const cover = anime.coverImage?.extraLarge || anime.coverImage?.large;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.5';
  const totalEpisodes = anime.episodes || 0;
  const nextAiring = anime.nextAiringEpisode;
  const isReleasing = anime.status === 'RELEASING';

  let releasedEpisodesCount = 0;
  if (anime.status === 'NOT_YET_RELEASED') {
    releasedEpisodesCount = 0;
  } else if (isReleasing) {
    if (nextAiring?.episode) {
      releasedEpisodesCount = Math.max(0, nextAiring.episode - 1);
    } else if (totalEpisodes > 0) {
      releasedEpisodesCount = totalEpisodes;
    } else {
      releasedEpisodesCount = 1;
    }
  } else {
    releasedEpisodesCount = totalEpisodes > 0 ? totalEpisodes : 12;
  }

  const isUnreleased = anime.status === 'NOT_YET_RELEASED' || releasedEpisodesCount === 0;
  const trailer = anime.trailer;
  const bookmarked = isBookmarked(anime.id);

  const batchSize = 25;
  const displayEpisodes = releasedEpisodesCount;
  const totalBatches = Math.max(1, Math.ceil(displayEpisodes / batchSize));
  const allEpisodes = Array.from({ length: displayEpisodes }, (_, i) => i + 1);

  const episodesToDisplay = searchQuery.trim()
    ? allEpisodes.filter(ep => ep.toString().includes(searchQuery.trim()))
    : allEpisodes.slice(selectedBatch * batchSize, (selectedBatch + 1) * batchSize);

  return (
    <div className="w-full flex flex-col pb-20">
      {/* Hero Banner Section */}
      <section className="relative h-[70vh] min-h-[500px] max-h-[680px] w-full mt-14 md:mt-0">
        <div className="absolute inset-0 w-full h-full">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${banner})` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#121414] via-[#121414]/70 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#121414] via-[#121414]/70 to-transparent"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative h-full px-4 sm:px-8 md:px-16 flex flex-col justify-end pb-10 sm:pb-12 z-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            {anime.genres?.slice(0, 3).map((g) => (
              <span
                key={g}
                className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-[#1E2020]/70 backdrop-blur-md rounded border border-[#4d4635] text-[10px] sm:text-[11px] font-bold text-[#ffe9b0] uppercase tracking-wider"
              >
                {g}
              </span>
            ))}
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-[#282a2a]/60 backdrop-blur-md rounded text-[10px] sm:text-[11px] font-bold text-[#e2e2e2] uppercase">
              {anime.format || 'TV'}
            </span>
            <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 backdrop-blur-md rounded text-[10px] sm:text-[11px] font-bold uppercase ${
              anime.status === 'RELEASING'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : anime.status === 'NOT_YET_RELEASED'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-[#1E2020]/70 text-[#d0c5af]'
            }`}>
              {anime.status?.replace('_', ' ') || 'FINISHED'}
            </span>
            {anime.seasonYear && (
              <span className="text-[11px] sm:text-xs text-[#d0c5af]/80 font-semibold ml-1">
                {anime.season ? `${anime.season} ` : ''}{anime.seasonYear}
              </span>
            )}
          </div>

          <h1 className="font-['Bodoni_Moda'] text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight drop-shadow-lg mb-2">
            {title}
          </h1>

          {romaji && romaji !== title && (
            <p className="text-xs sm:text-sm md:text-base text-[#d0c5af]/80 italic mb-3 sm:mb-4">
              {romaji} {native && `• ${native}`}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 mt-2">
            {!isUnreleased && (
              <button
                onClick={() => router.push(`/watch/${anime.id}?ep=1`)}
                className="px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#f2ca50] to-[#af8d11] text-[#241a00] font-bold text-xs sm:text-sm flex items-center gap-2 sm:gap-2.5 shadow-[0_0_20px_rgba(242,202,80,0.3)] hover:brightness-110 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                <span>Start Watching (Ep 1)</span>
              </button>
            )}

            <button
              onClick={() => toggleBookmark(anime)}
              className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md border transition-all cursor-pointer ${
                bookmarked
                  ? 'bg-[#ffe9b0]/20 text-[#ffe9b0] border-[#ffe9b0]'
                  : 'bg-[#1E2020]/70 text-[#e2e2e2] border-white/20 hover:bg-[#282a2a]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${bookmarked ? 'fill-current' : ''}`} />
              <span>{bookmarked ? 'In Watchlist' : 'Add to Watchlist'}</span>
            </button>

            {trailer?.id && (
              <button
                onClick={() => setIsTrailerModalOpen(true)}
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#1E2020]/70 hover:bg-[#282a2a] text-[#e2e2e2] hover:text-[#ffe9b0] font-semibold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md border border-white/20 transition-all cursor-pointer"
              >
                <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Trailer</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-8 md:px-16 mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          {/* Synopsis */}
          <div className="flex flex-col gap-3">
            <h2 className="font-['Bodoni_Moda'] text-2xl font-bold text-[#e2e2e2]">Synopsis</h2>
            <div
              className="text-[#d0c5af] leading-relaxed text-sm md:text-base space-y-3"
              dangerouslySetInnerHTML={{
                __html: anime.description || 'No description available for this anime.',
              }}
            />
          </div>

          {/* Episodes Section */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-[#4d4635]/30 pb-3">
              <div>
                <h2 className="font-['Bodoni_Moda'] text-2xl font-bold text-[#e2e2e2]">Episodes</h2>
                <p className="text-xs text-[#ffe9b0] mt-0.5 flex items-center gap-2">
                  <span>
                    {isUnreleased ? 'Upcoming Series' : `${displayEpisodes} Released Episode${displayEpisodes === 1 ? '' : 's'}`}
                    {isReleasing && totalEpisodes > displayEpisodes && ` (${totalEpisodes} Planned)`}
                  </span>
                  {isReleasing && nextAiring?.episode && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase">
                      Ep {nextAiring.episode} Airing Soon
                    </span>
                  )}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {!isUnreleased && displayEpisodes > 12 && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Jump to Ep #..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-[#1E2020] border border-[#4d4635]/50 text-xs text-[#e2e2e2] rounded-lg pl-7 pr-2.5 py-1.5 focus:border-[#ffe9b0] outline-none w-32 sm:w-36"
                    />
                    <Search className="w-3.5 h-3.5 text-[#99907c] absolute left-2 top-2" />
                  </div>
                )}

                <div className="flex bg-[#1E2020] rounded-lg p-0.5 border border-[#4d4635]/50">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded text-xs transition-colors ${
                      viewMode === 'grid' ? 'bg-[#ffe9b0] text-[#241a00]' : 'text-[#99907c] hover:text-[#ffe9b0]'
                    }`}
                    title="Grid View"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('detail')}
                    className={`p-1.5 rounded text-xs transition-colors ${
                      viewMode === 'detail' ? 'bg-[#ffe9b0] text-[#241a00]' : 'text-[#99907c] hover:text-[#ffe9b0]'
                    }`}
                    title="List View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Batch Selector */}
            {!isUnreleased && totalBatches > 1 && !searchQuery && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {Array.from({ length: totalBatches }).map((_, idx) => {
                  const from = idx * batchSize + 1;
                  const to = Math.min((idx + 1) * batchSize, displayEpisodes);
                  const isCurrentBatch = selectedBatch === idx;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedBatch(idx)}
                      className={`px-3 py-1 text-xs rounded font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isCurrentBatch
                          ? 'bg-[#ffe9b0] text-[#241a00] font-bold shadow'
                          : 'bg-[#1E2020] text-[#d0c5af] hover:text-[#ffe9b0] border border-white/5'
                      }`}
                    >
                      {from} - {to}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Episode List / Modes */}
            {isUnreleased ? (
              <div className="p-8 rounded-2xl bg-[#1E2020] border border-[#f2ca50]/30 flex flex-col items-center justify-center text-center gap-3">
                <Clock className="w-10 h-10 text-[#f2ca50]" />
                <h3 className="font-['Bodoni_Moda'] text-xl text-[#e2e2e2]">Upcoming Season</h3>
                <p className="text-xs text-[#d0c5af] max-w-md">
                  Episodes for this anime have not aired yet. Add this title to your Watchlist to stay tuned when it releases!
                </p>
                <button
                  onClick={() => toggleBookmark(anime)}
                  className="mt-2 px-6 py-2.5 rounded-xl bg-[#ffe9b0] text-[#241a00] font-bold text-xs hover:bg-[#f2ca50] cursor-pointer"
                >
                  {bookmarked ? '✓ In Your Watchlist' : '+ Add to Watchlist'}
                </button>
              </div>
            ) : episodesToDisplay.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#1E2020] text-center text-[#99907c] text-xs">
                No episodes found matching &quot;{searchQuery}&quot;
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                {episodesToDisplay.map((epNum) => (
                  <button
                    key={epNum}
                    onClick={() => router.push(`/watch/${anime.id}?ep=${epNum}`)}
                    className="h-12 rounded-xl bg-[#1E2020] hover:bg-[#282a2a] text-[#e2e2e2] hover:text-[#ffe9b0] border border-[#4d4635]/40 hover:border-[#ffe9b0] text-sm font-bold transition-all flex items-center justify-center cursor-pointer shadow hover:scale-105"
                  >
                    {epNum}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {episodesToDisplay.map((epNum) => {
                  const streamingEpisodes = Array.isArray(anime.streamingEpisodes) ? anime.streamingEpisodes : [];
                  const characterImages = (anime.characters?.edges || [])
                    .map((e) => e?.node?.image?.large)
                    .filter(Boolean);

                  const matchingStreamEp =
                    streamingEpisodes.find((se) => {
                      const t = (se.title || '').toLowerCase();
                      return (
                        t.includes(`episode ${epNum} `) ||
                        t.includes(`episode ${epNum}:`) ||
                        t.includes(`episode ${epNum}-`) ||
                        t.includes(`ep ${epNum} `) ||
                        t.includes(`ep. ${epNum} `) ||
                        t.endsWith(`episode ${epNum}`) ||
                        t.endsWith(`ep ${epNum}`) ||
                        t === `episode ${epNum}`
                      );
                    }) || streamingEpisodes[epNum - 1];

                  let epThumb = matchingStreamEp?.thumbnail;
                  if (!epThumb) {
                    if (characterImages.length > 0) {
                      epThumb = characterImages[(epNum - 1) % characterImages.length];
                    } else {
                      epThumb = banner || cover;
                    }
                  }

                  let epTitle = `Episode ${epNum}`;
                  if (matchingStreamEp?.title) {
                    let cleanTitle = matchingStreamEp.title.trim();
                    if (cleanTitle.match(/^episode\s+\d+[\s:–—-]+/i)) {
                      cleanTitle = cleanTitle.replace(/^episode\s+\d+[\s:–—-]+/i, '').trim();
                    } else if (cleanTitle.match(/^ep\.?\s*\d+[\s:–—-]+/i)) {
                      cleanTitle = cleanTitle.replace(/^ep\.?\s*\d+[\s:–—-]+/i, '').trim();
                    } else if (cleanTitle.match(/^\d+[\s:–—-]+/)) {
                      cleanTitle = cleanTitle.replace(/^\d+[\s:–—-]+/, '').trim();
                    }
                    epTitle = cleanTitle || matchingStreamEp.title;
                  }

                  return (
                    <div
                      key={epNum}
                      onClick={() => router.push(`/watch/${anime.id}?ep=${epNum}`)}
                      className="group flex gap-4 p-3.5 rounded-xl bg-[#1E2020] hover:bg-[#282a2a] transition-all cursor-pointer border border-transparent hover:border-[#ffe9b0]/30 shadow"
                    >
                      <div className="relative w-36 sm:w-44 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-[#121414]">
                        <img
                          src={epThumb}
                          alt={`Episode ${epNum}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <PlayCircle className="w-8 h-8 text-[#ffe9b0]" />
                        </div>
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white/90">
                          24m
                        </div>
                      </div>

                      <div className="flex flex-col justify-center min-w-0">
                        <span className="text-xs font-bold text-[#ffe9b0] uppercase tracking-wider">
                          Episode {epNum}
                        </span>
                        <h4 className="text-sm font-semibold text-[#e2e2e2] group-hover:text-white truncate">
                          {epTitle}
                        </h4>
                        <p className="text-xs text-[#99907c] line-clamp-2 mt-1 hidden sm:block">
                          Follow the progression, encounters, and character development in this released episode.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cast */}
          {anime.characters?.edges?.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-['Bodoni_Moda'] text-2xl font-bold text-[#e2e2e2]">Characters & Cast</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {anime.characters.edges.map(({ role, node, voiceActors }) => {
                  const va = voiceActors?.[0];
                  return (
                    <div
                      key={node.id}
                      className="flex gap-3 p-3 rounded-xl bg-[#1E2020] border border-white/5 items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={node.image?.large || node.image?.medium}
                          alt={node.name?.full}
                          className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-[#e2e2e2] truncate">{node.name?.full}</span>
                          <span className="text-[10px] text-[#99907c] uppercase">{role}</span>
                        </div>
                      </div>

                      {va && (
                        <div className="flex items-center gap-2 flex-shrink-0 text-right">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-semibold text-[#ffe9b0] truncate max-w-[80px]">
                              {va.name?.full}
                            </span>
                            <span className="text-[9px] text-[#99907c]">Japanese</span>
                          </div>
                          <img
                            src={va.image?.large || va.image?.medium}
                            alt={va.name?.full}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Metadata Sidebar (4 cols - Sticky on Desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl bg-[#1E2020] border border-[#4d4635]/40 p-5 flex flex-col gap-5 shadow-xl">
            <div className="aspect-[3/4] w-full rounded-xl overflow-hidden shadow-md">
              <img src={cover} alt={title} className="w-full h-full object-cover" />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-b border-[#4d4635]/30 py-4">
              <div>
                <span className="text-[10px] text-[#99907c] uppercase font-semibold">Score</span>
                <p className="text-lg font-bold text-[#ffe9b0] flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current text-[#f2ca50]" />
                  {score}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#99907c] uppercase font-semibold">Format</span>
                <p className="text-sm font-bold text-[#e2e2e2]">{anime.format || 'TV'}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#99907c] uppercase font-semibold">Episodes</span>
                <p className="text-sm font-bold text-[#e2e2e2]">
                  {isUnreleased ? '0' : displayEpisodes}
                  {isReleasing && totalEpisodes > displayEpisodes && ` / ${totalEpisodes}`}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#99907c] uppercase font-semibold">Duration</span>
                <p className="text-sm font-bold text-[#e2e2e2]">{anime.duration ? `${anime.duration}m` : '24m'}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-xs text-[#d0c5af]">
              <div>
                <span className="text-[10px] text-[#99907c] uppercase font-semibold block">Studios</span>
                <span className="text-[#e2e2e2] font-medium">
                  {anime.studios?.nodes?.map(s => s.name).join(', ') || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#99907c] uppercase font-semibold block">Status</span>
                <span className="text-[#ffe9b0] font-medium capitalize">
                  {anime.status?.replace('_', ' ').toLowerCase() || 'Finished'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#99907c] uppercase font-semibold block">Genres</span>
                <span className="text-[#e2e2e2] font-medium">{anime.genres?.join(', ') || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      {isTrailerModalOpen && trailer?.id && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsTrailerModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#ffe9b0]/30"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsTrailerModalOpen(false)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/70 text-[#ffe9b0] hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${trailer.id}?autoplay=1`}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
}

