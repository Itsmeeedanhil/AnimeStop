import React, { useState, useEffect, useRef } from 'react';
import { AnimeApi, LibraryApi } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';

export default function PlayerPage({ id, episode = 1, navigate, showNotification }) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [viewMode, setViewMode] = useState('detail'); // 'detail' or 'grid'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBatch, setSelectedBatch] = useState(0);

    const epNumber = parseInt(episode, 10) || 1;
    const activeEpisodeRef = useRef(null);
    const batchSize = 25; // Clean 25-episode batches

    useEffect(() => {
        const fetchStream = async () => {
            setIsLoading(true);
            try {
                const streamData = await AnimeApi.getStream(id, epNumber);
                setData(streamData);

                // Auto-select batch containing current episode
                const currentBatchIndex = Math.floor((epNumber - 1) / batchSize);
                setSelectedBatch(currentBatchIndex);

                // Check watchlist status
                const lib = await LibraryApi.getLibrary();
                const exists = (lib.watchlist || []).some(w => w.anime_id === Number(id));
                setIsBookmarked(exists);
            } catch (err) {
                console.error('Failed to load stream data', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchStream();
    }, [id, epNumber]);

    // Auto-scroll to active episode when queue loads
    useEffect(() => {
        if (activeEpisodeRef.current) {
            activeEpisodeRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [epNumber, data, selectedBatch, viewMode]);

    const handleWatchlistToggle = async () => {
        if (!data?.anime) return;
        try {
            const res = await LibraryApi.toggleWatchlist(data.anime);
            setIsBookmarked(res.isBookmarked);
            if (showNotification) {
                showNotification(res.isBookmarked ? 'Added to your Watchlist' : 'Removed from Watchlist');
            }
        } catch (err) {
            console.error('Failed to toggle watchlist', err);
        }
    };

    const handleNextEpisode = () => {
        if (data?.stream?.navigation?.hasNext) {
            navigate(`/watch/${id}/${epNumber + 1}`);
        }
    };

    const handlePrevEpisode = () => {
        if (data?.stream?.navigation?.hasPrevious) {
            navigate(`/watch/${id}/${epNumber - 1}`);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[85vh] flex flex-col items-center justify-center gap-4 bg-[#0d0f0f] text-[#ffe9b0]">
                <span className="w-12 h-12 border-3 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></span>
                <p className="text-sm font-['Hanken_Grotesk'] text-[#d0c5af]">Connecting to Anime Stream Servers...</p>
            </div>
        );
    }

    if (!data?.anime) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#0d0f0f] text-center p-4">
                <span className="material-symbols-outlined text-5xl text-[#ffe9b0]/50">error</span>
                <h2 className="font-['Bodoni_Moda'] text-2xl text-[#e2e2e2]">Anime Stream Unavailable</h2>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2.5 rounded-lg bg-[#ffe9b0] text-[#241a00] font-semibold text-sm hover:bg-[#f2ca50]"
                >
                    Back to Browse
                </button>
            </div>
        );
    }

    const { anime, stream } = data;
    const animeTitle = anime.title?.english || anime.title?.romaji;
    const episodes = stream.episodes || [];
    const totalEpisodesCount = anime.episodes || episodes.length;

    // Filter episodes by search query or by batch
    const totalBatches = Math.max(1, Math.ceil(episodes.length / batchSize));
    
    const filteredEpisodes = searchQuery.trim()
        ? episodes.filter(ep => 
            ep.number.toString().includes(searchQuery.trim()) || 
            `episode ${ep.number}`.includes(searchQuery.toLowerCase().trim())
          )
        : episodes.slice(selectedBatch * batchSize, (selectedBatch + 1) * batchSize);

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-61px)] w-full relative bg-[#0d0f0f] overflow-hidden">
            {/* Left: Video Player Section */}
            <div className="flex-1 flex flex-col justify-start bg-black overflow-y-auto custom-scrollbar">
                {/* Back to Details Header */}
                <div className="bg-[#121414] px-4 md:px-6 py-3 border-b border-[#4d4635]/40 flex items-center justify-between">
                    <button
                        onClick={() => navigate(`/anime/${id}`)}
                        className="text-[#ffe9b0] hover:text-white transition-colors flex items-center gap-2 group text-sm font-semibold cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-xl group-hover:-translate-x-1 transition-transform">
                            arrow_back
                        </span>
                        <span className="font-['Hanken_Grotesk'] uppercase tracking-wider text-xs">
                            Back to Overview
                        </span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#99907c] font-medium hidden sm:inline">
                            {animeTitle} • Episode {epNumber}
                        </span>
                    </div>
                </div>

                {/* Video Player Component */}
                <VideoPlayer
                    streamData={stream}
                    anime={anime}
                    currentEpisode={epNumber}
                    onNextEpisode={handleNextEpisode}
                    onPrevEpisode={handlePrevEpisode}
                    navigate={navigate}
                />

                {/* Quick Info Below Player */}
                <div className="p-4 md:p-6 bg-[#121414] border-t border-[#4d4635]/30">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                            <h1 className="font-['Bodoni_Moda'] text-xl md:text-2xl font-bold text-[#e2e2e2]">
                                {animeTitle}
                            </h1>
                            <p className="text-sm font-semibold text-[#ffe9b0] mt-0.5">
                                Episode {epNumber} of {totalEpisodesCount}
                            </p>
                        </div>

                        <button
                            onClick={handleWatchlistToggle}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                isBookmarked
                                    ? 'bg-[#ffe9b0]/20 border-[#ffe9b0] text-[#ffe9b0]'
                                    : 'bg-[#1E2020] border-white/20 text-[#d0c5af] hover:text-[#ffe9b0]'
                            }`}
                        >
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}>
                                {isBookmarked ? 'bookmark_added' : 'bookmark_add'}
                            </span>
                            <span>{isBookmarked ? 'In Watchlist' : 'Add to List'}</span>
                        </button>
                    </div>

                    <p className="text-xs text-[#99907c] mt-3 leading-relaxed max-w-3xl">
                        {anime.description || 'Watch high-quality streaming on AnimeStop with multi-server playback.'}
                    </p>
                </div>
            </div>

            {/* Right: Optimized High-Volume Episode Queue Sidebar */}
            <div className="w-full lg:w-[380px] xl:w-[420px] bg-[#1E2020] flex flex-col border-t lg:border-t-0 lg:border-l border-[#4d4635]/40 h-[560px] lg:h-full shrink-0">
                {/* Series Info Header */}
                <div className="p-4 border-b border-[#4d4635]/30 flex flex-col gap-1 shrink-0 bg-[#1a1c1c]">
                    <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                            <h2 className="font-['Bodoni_Moda'] text-lg font-bold text-[#e2e2e2] truncate">
                                {animeTitle}
                            </h2>
                            <p className="font-['Hanken_Grotesk'] text-xs text-[#ffe9b0]">
                                Playing Episode {epNumber} of {totalEpisodesCount}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Controls Bar: Search, View Mode & Batch Selector */}
                <div className="p-3 bg-[#161818] border-b border-white/5 flex flex-col gap-2.5 shrink-0">
                    {/* Top row: Search input + View Mode toggle */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Jump to Episode #..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#121414] border border-[#4d4635]/50 focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-lg pl-8 pr-3 py-1.5 outline-none transition-colors"
                            />
                            <span className="material-symbols-outlined absolute left-2 top-1.5 text-base text-[#99907c]">
                                search
                            </span>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1.5 text-[#99907c] hover:text-white"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            )}
                        </div>

                        {/* View Mode Toggle: Grid vs Detail List */}
                        <div className="flex bg-[#121414] rounded-lg p-0.5 border border-[#4d4635]/50">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded text-xs transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-[#ffe9b0] text-[#241a00]'
                                        : 'text-[#99907c] hover:text-[#ffe9b0]'
                                }`}
                                title="Compact Grid View"
                            >
                                <span className="material-symbols-outlined text-base">grid_view</span>
                            </button>
                            <button
                                onClick={() => setViewMode('detail')}
                                className={`p-1.5 rounded text-xs transition-colors ${
                                    viewMode === 'detail'
                                        ? 'bg-[#ffe9b0] text-[#241a00]'
                                        : 'text-[#99907c] hover:text-[#ffe9b0]'
                                }`}
                                title="Detailed List View"
                            >
                                <span className="material-symbols-outlined text-base">view_list</span>
                            </button>
                        </div>
                    </div>

                    {/* Batch Range Pills (if > 25 episodes and not actively searching) */}
                    {!searchQuery && totalBatches > 1 && (
                        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                            {Array.from({ length: totalBatches }).map((_, idx) => {
                                const from = idx * batchSize + 1;
                                const to = Math.min(episodes.length, (idx + 1) * batchSize);
                                const isCurrentBatch = selectedBatch === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedBatch(idx)}
                                        className={`px-2.5 py-1 text-[11px] rounded font-semibold whitespace-nowrap transition-all cursor-pointer ${
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

                {/* Scrollable Episode Area */}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    {filteredEpisodes.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center text-[#99907c]">
                            <span className="material-symbols-outlined text-3xl mb-1 text-[#ffe9b0]">search_off</span>
                            <p className="text-xs">No episode matched "{searchQuery}"</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* Compact Number Grid View (100+ episodes fast navigation) */
                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                            {filteredEpisodes.map((ep) => {
                                const isActive = ep.number === epNumber;
                                return (
                                    <button
                                        key={ep.number}
                                        ref={isActive ? activeEpisodeRef : null}
                                        onClick={() => navigate(`/watch/${id}/${ep.number}`)}
                                        className={`h-11 rounded-lg font-['Hanken_Grotesk'] text-xs font-bold transition-all flex items-center justify-center cursor-pointer border ${
                                            isActive
                                                ? 'bg-[#ffe9b0] text-[#241a00] border-[#ffe9b0] shadow-[0_0_12px_rgba(255,233,176,0.4)] transform scale-105'
                                                : 'bg-[#121414]/80 text-[#d0c5af] border-[#4d4635]/40 hover:border-[#ffe9b0] hover:text-[#ffe9b0] hover:bg-[#282a2a]'
                                        }`}
                                        title={`Episode ${ep.number}`}
                                    >
                                        {ep.number}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* Detailed Cards View */
                        <div className="flex flex-col gap-2">
                            {filteredEpisodes.map((ep) => {
                                const isActive = ep.number === epNumber;
                                return (
                                    <div
                                        key={ep.number}
                                        ref={isActive ? activeEpisodeRef : null}
                                        onClick={() => navigate(`/watch/${id}/${ep.number}`)}
                                        className={`flex gap-3 p-2 rounded-xl transition-all cursor-pointer border relative overflow-hidden group ${
                                            isActive
                                                ? 'bg-[#282a2a] border-[#ffe9b0]/50 shadow-md'
                                                : 'bg-[#121414]/60 hover:bg-[#282a2a] border-transparent hover:border-[#4d4635]/40'
                                        }`}
                                    >
                                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ffe9b0]"></div>}

                                        {/* Thumbnail */}
                                        <div className="w-24 aspect-video bg-[#0d0f0f] rounded-lg flex-shrink-0 relative overflow-hidden">
                                            <img
                                                src={ep.thumbnail || anime.bannerImage || anime.coverImage?.large}
                                                alt={ep.title}
                                                className={`w-full h-full object-cover transition-opacity ${
                                                    isActive ? 'opacity-70' : 'opacity-60 group-hover:opacity-90'
                                                }`}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                {isActive ? (
                                                    <span className="material-symbols-outlined text-[#ffe9b0] text-2xl animate-pulse">
                                                        equalizer
                                                    </span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-white/80 opacity-0 group-hover:opacity-100 text-2xl transition-opacity">
                                                        play_circle
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Episode Info */}
                                        <div className="flex flex-col justify-center min-w-0 flex-1">
                                            <span className={`text-[10px] font-bold tracking-wider uppercase mb-0.5 ${
                                                isActive ? 'text-[#ffe9b0]' : 'text-[#99907c] group-hover:text-[#ffe9b0]'
                                            }`}>
                                                EPISODE {ep.number}
                                            </span>
                                            <h3 className={`text-xs font-semibold truncate ${
                                                isActive ? 'text-white' : 'text-[#d0c5af] group-hover:text-white'
                                            }`}>
                                                Episode {ep.number}
                                            </h3>
                                            <span className="text-[10px] text-[#99907c] mt-0.5">24m</span>
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
