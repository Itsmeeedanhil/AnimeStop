'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { AnimeApi, getLastWatchedEpisode } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AnimeCard from '@/components/AnimeCard';
import {
  Play,
  Bookmark,
  Film,
  Star,
  Grid,
  List,
  Search,
  X,
  Clock,
  PlayCircle,
  AlertCircle,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';

export default function DetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const { isBookmarked, toggleBookmark } = useAuth();

  const [anime, setAnime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastWatchedEp, setLastWatchedEp] = useState(1);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('detail');

  useEffect(() => {
    if (id) {
      const ep = getLastWatchedEpisode(id);
      setLastWatchedEp(ep || 1);
    }
  }, [id]);

  useEffect(() => {
    const fetchAnime = async () => {
      setIsLoading(true);
      try {
        const data = await AnimeApi.getDetails(id);
        setAnime(data);
        if (data?.seasons?.length > 0) {
          const initialSeason = data.seasons[0].seasonNumber || 1;
          setSelectedSeason(initialSeason);
        }
      } catch (err) {
        console.error('Failed to load anime details', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchAnime();
  }, [id]);

  // Fetch episodes whenever selectedSeason or anime changes
  useEffect(() => {
    if (!id || !anime || anime.isMovie) return;

    const fetchEpisodes = async () => {
      setIsLoadingEpisodes(true);
      try {
        const eps = await AnimeApi.getSeasonEpisodes(id, selectedSeason);
        if (Array.isArray(eps) && eps.length > 0) {
          setSeasonEpisodes(eps);
        } else {
          // Generate fallback episodes if season episodes list is empty
          const targetSeasonObj = anime.seasons?.find((s) => s.seasonNumber === selectedSeason);
          const count = targetSeasonObj?.episodeCount || anime.episodes || 12;
          const fallback = Array.from({ length: count }, (_, i) => ({
            number: i + 1,
            seasonNumber: selectedSeason,
            title: `Episode ${i + 1}`,
            duration: '24m',
            thumbnail: anime.bannerImage || anime.coverImage?.extraLarge,
            synopsis: `Episode ${i + 1} of Season ${selectedSeason}.`,
            isReleased: true,
          }));
          setSeasonEpisodes(fallback);
        }
      } catch (err) {
        console.error('Failed to load season episodes', err);
        const count = anime.episodes || 12;
        const fallback = Array.from({ length: count }, (_, i) => ({
          number: i + 1,
          seasonNumber: selectedSeason,
          title: `Episode ${i + 1}`,
          duration: '24m',
          thumbnail: anime.bannerImage || anime.coverImage?.extraLarge,
          synopsis: `Episode ${i + 1} of Season ${selectedSeason}.`,
          isReleased: true,
        }));
        setSeasonEpisodes(fallback);
      } finally {
        setIsLoadingEpisodes(false);
      }
    };

    fetchEpisodes();
  }, [id, anime, selectedSeason]);

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
  const isMovie = anime.isMovie || anime.format === 'MOVIE';
  const seasonsList = anime.seasons || [];
  const currentSeasonObj = seasonsList.find((s) => s.seasonNumber === selectedSeason) || seasonsList[0];
  const trailer = anime.trailer;
  const bookmarked = isBookmarked(anime.id);

  const batchSize = 25;
  const totalEpisodesCount = seasonEpisodes.length || currentSeasonObj?.episodeCount || 12;
  const totalBatches = Math.max(1, Math.ceil(totalEpisodesCount / batchSize));

  const episodesToDisplay = searchQuery.trim()
    ? seasonEpisodes.filter(
        (ep) =>
          ep.number.toString().includes(searchQuery.trim()) ||
          (ep.title && ep.title.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : seasonEpisodes.slice(selectedBatch * batchSize, (selectedBatch + 1) * batchSize);

  const recommendationsList = (anime.recommendations?.edges || [])
    .map((e) => e?.node?.mediaRecommendation)
    .filter(Boolean);

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
              <Link
                key={g}
                href={`/search?genre=${encodeURIComponent(g)}`}
                className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-[#1E2020]/70 hover:bg-[#ffe9b0]/20 backdrop-blur-md rounded border border-[#4d4635] text-[10px] sm:text-[11px] font-bold text-[#ffe9b0] uppercase tracking-wider transition-colors"
              >
                {g}
              </Link>
            ))}
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-[#282a2a]/60 backdrop-blur-md rounded text-[10px] sm:text-[11px] font-bold text-[#e2e2e2] uppercase">
              {anime.format || 'TV'}
            </span>
            <span
              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 backdrop-blur-md rounded text-[10px] sm:text-[11px] font-bold uppercase ${
                anime.status === 'RELEASING'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : anime.status === 'NOT_YET_RELEASED'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-[#1E2020]/70 text-[#d0c5af]'
              }`}
            >
              {anime.status?.replace('_', ' ') || 'FINISHED'}
            </span>
            {anime.seasonYear && (
              <span className="text-[11px] sm:text-xs text-[#d0c5af]/80 font-semibold ml-1">
                {anime.seasonYear}
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
            <button
              onClick={() => router.push(`/watch/${anime.id}?season=${selectedSeason}&ep=${lastWatchedEp}`)}
              className="px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#f2ca50] to-[#af8d11] text-[#241a00] font-bold text-xs sm:text-sm flex items-center gap-2 sm:gap-2.5 shadow-[0_0_20px_rgba(242,202,80,0.3)] hover:brightness-110 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>
                {isMovie
                  ? 'Watch Movie'
                  : lastWatchedEp > 1
                  ? `Resume Ep ${lastWatchedEp}`
                  : `Start Watching (${currentSeasonObj?.name || `Season ${selectedSeason}`} Ep 1)`}
              </span>
            </button>

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

          {/* Multi-Season Tabs & Episodes Section */}
          <div className="flex flex-col gap-4">
            {/* Season Selector Tabs if Multi-Season */}
            {!isMovie && seasonsList.length > 1 && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#ffe9b0] uppercase tracking-wider">
                  <Layers className="w-4 h-4" />
                  <span>Select Season:</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                  {seasonsList.map((s) => {
                    const isSelected = s.seasonNumber === selectedSeason;
                    return (
                      <button
                        key={s.seasonNumber}
                        onClick={() => {
                          setSelectedSeason(s.seasonNumber);
                          setSelectedBatch(0);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-2 ${
                          isSelected
                            ? 'bg-[#ffe9b0] text-[#241a00] border-[#ffe9b0] shadow-[0_0_15px_rgba(255,233,176,0.35)] scale-105'
                            : 'bg-[#1E2020] hover:bg-[#282a2a] text-[#d0c5af] hover:text-white border-[#4d4635]/50'
                        }`}
                      >
                        <span>{s.name || `Season ${s.seasonNumber}`}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            isSelected ? 'bg-[#241a00]/20 text-[#241a00]' : 'bg-black/40 text-[#ffe9b0]'
                          }`}
                        >
                          {s.episodeCount} Ep
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Episodes Header & Controls */}
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-[#4d4635]/30 pb-3 mt-2">
              <div>
                <h2 className="font-['Bodoni_Moda'] text-2xl font-bold text-[#e2e2e2]">
                  {isMovie ? 'Movie Stream' : currentSeasonObj?.name || `Season ${selectedSeason} Episodes`}
                </h2>
                <p className="text-xs text-[#ffe9b0] mt-0.5 flex items-center gap-2">
                  <span>
                    {isMovie ? 'Full Feature Film' : `${totalEpisodesCount} Episode${totalEpisodesCount === 1 ? '' : 's'}`}
                  </span>
                </p>
              </div>

              {/* Controls */}
              {!isMovie && (
                <div className="flex items-center gap-3">
                  {totalEpisodesCount > 12 && (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search Episode..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#1E2020] border border-[#4d4635]/50 text-xs text-[#e2e2e2] rounded-lg pl-7 pr-2.5 py-1.5 focus:border-[#ffe9b0] outline-none w-36 sm:w-44"
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
              )}
            </div>

            {/* Batch Selector if > 25 episodes */}
            {!isMovie && totalBatches > 1 && !searchQuery && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {Array.from({ length: totalBatches }).map((_, idx) => {
                  const from = idx * batchSize + 1;
                  const to = Math.min((idx + 1) * batchSize, totalEpisodesCount);
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

            {/* Episode List / Loading / Modes */}
            {isLoadingEpisodes ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-[#ffe9b0]">
                <div className="w-8 h-8 border-3 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-[#d0c5af]">Loading season episodes...</p>
              </div>
            ) : isMovie ? (
              <div
                onClick={() => router.push(`/watch/${anime.id}?ep=1`)}
                className="group flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-[#1E2020] hover:bg-[#282a2a] transition-all cursor-pointer border border-[#ffe9b0]/30 hover:border-[#ffe9b0] shadow-xl"
              >
                <div className="relative aspect-video sm:w-64 rounded-xl overflow-hidden bg-[#121414] shrink-0">
                  <img
                    src={banner || cover}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-[#ffe9b0] group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <div className="flex flex-col justify-center flex-1">
                  <span className="text-xs font-bold text-[#ffe9b0] uppercase tracking-wider">
                    Full Anime Movie
                  </span>
                  <h3 className="font-['Bodoni_Moda'] text-xl font-bold text-[#e2e2e2] group-hover:text-white mt-1">
                    {title}
                  </h3>
                  <p className="text-xs text-[#d0c5af] line-clamp-3 mt-2">
                    {anime.description?.replace(/<[^>]*>?/gm, '') || 'Watch the full anime movie with high-definition audio and crystal clear streams.'}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-[#ffe9b0] text-[#241a00] font-bold text-xs flex items-center gap-1.5 shadow">
                      <Play className="w-3.5 h-3.5 fill-current" /> Stream Movie Now
                    </span>
                  </div>
                </div>
              </div>
            ) : episodesToDisplay.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#1E2020] text-center text-[#99907c] text-xs">
                No episodes found matching &quot;{searchQuery}&quot;
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                {episodesToDisplay.map((ep) => {
                  const epNum = ep.number;
                  const isEpReleased = ep.isReleased !== false;
                  return (
                    <button
                      key={epNum}
                      onClick={() => router.push(`/watch/${anime.id}?season=${selectedSeason}&ep=${epNum}`)}
                      className={`h-12 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer shadow hover:scale-105 border ${
                        isEpReleased
                          ? 'bg-[#1E2020] hover:bg-[#282a2a] text-[#e2e2e2] hover:text-[#ffe9b0] border-[#4d4635]/40 hover:border-[#ffe9b0]'
                          : 'bg-[#1E2020]/60 text-[#99907c] border-amber-500/20 hover:border-amber-500/50 hover:bg-[#202222]'
                      }`}
                    >
                      <span>{epNum}</span>
                      <span className={`text-[8px] font-semibold ${isEpReleased ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isEpReleased ? 'Aired' : 'Soon'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {episodesToDisplay.map((ep) => {
                  const epNum = ep.number;
                  const isEpReleased = ep.isReleased !== false;
                  const epThumb = ep.thumbnail || banner || cover;
                  const epTitle = ep.title || `Episode ${epNum}`;

                  return (
                    <div
                      key={epNum}
                      onClick={() => router.push(`/watch/${anime.id}?season=${selectedSeason}&ep=${epNum}`)}
                      className={`group flex gap-4 p-3.5 rounded-xl bg-[#1E2020] hover:bg-[#282a2a] transition-all cursor-pointer border border-transparent hover:border-[#ffe9b0]/30 shadow ${
                        !isEpReleased ? 'opacity-80 hover:opacity-100' : ''
                      }`}
                    >
                      <div className="relative w-36 sm:w-44 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-[#121414]">
                        <img
                          src={epThumb}
                          alt={`Episode ${epNum}`}
                          onError={(e) => {
                            e.currentTarget.src = banner || cover || '/favicon.svg';
                          }}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {isEpReleased ? (
                            <PlayCircle className="w-8 h-8 text-[#ffe9b0]" />
                          ) : (
                            <Clock className="w-8 h-8 text-amber-300" />
                          )}
                        </div>
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white/90">
                          {ep.duration || '24m'}
                        </div>
                      </div>

                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-[#ffe9b0] uppercase tracking-wider">
                            Episode {epNum}
                          </span>
                          {isEpReleased ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Aired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Upcoming
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-[#e2e2e2] group-hover:text-white truncate">
                          {epTitle}
                        </h4>
                        <p className="text-xs text-[#99907c] line-clamp-2 mt-1 hidden sm:block">
                          {ep.synopsis || (isEpReleased
                            ? 'Follow the progression and story developments in this episode.'
                            : 'This episode is scheduled for upcoming broadcast.')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cast & Characters */}
          {anime.characters?.edges?.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-['Bodoni_Moda'] text-2xl font-bold text-[#e2e2e2]">Characters & Cast</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {anime.characters.edges.slice(0, 9).map(({ node }) => (
                  <div
                    key={node.actorName || node.name?.full}
                    className="flex gap-3 p-3 rounded-xl bg-[#1E2020] border border-white/5 items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={node.image?.large || node.image?.medium || cover}
                        alt={node.actorName || node.name?.full}
                        className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-[#e2e2e2] truncate">{node.name?.full}</span>
                        <span className="text-[10px] text-[#ffe9b0] truncate">{node.actorName || 'Japanese VA'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations / More Like This */}
          {recommendationsList.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-['Bodoni_Moda'] text-2xl font-bold text-[#e2e2e2] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#ffe9b0]" />
                  More Like This
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {recommendationsList.slice(0, 8).map((rec) => (
                  <AnimeCard key={rec.id} anime={rec} />
                ))}
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
                <span className="text-[10px] text-[#99907c] uppercase font-semibold">Seasons</span>
                <p className="text-sm font-bold text-[#e2e2e2]">
                  {isMovie ? '1 Movie' : `${seasonsList.length || 1} Season${seasonsList.length > 1 ? 's' : ''}`}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#99907c] uppercase font-semibold">Duration</span>
                <p className="text-sm font-bold text-[#e2e2e2]">{anime.duration ? `${anime.duration}m` : '24m'}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-xs text-[#d0c5af]">
              <div>
                <span className="text-[10px] text-[#99907c] uppercase font-semibold block">Studios / Companies</span>
                <span className="text-[#e2e2e2] font-medium">
                  {anime.studios?.nodes?.map((s) => s.name).join(', ') || 'Unknown'}
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
