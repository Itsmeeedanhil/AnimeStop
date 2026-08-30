import React, { useState, useEffect } from 'react';
import { LibraryApi } from '../services/api';

export default function VideoPlayer({ streamData, anime, currentEpisode, onNextEpisode, onPrevEpisode, navigate }) {
    const isUnreleased = streamData?.isUnreleased;
    const animeTitle = anime?.title?.english || anime?.title?.romaji || 'Anime';
    const trailerUrl = streamData?.trailerEmbedUrl;
    const servers = streamData?.servers || [];

    const defaultServerId = isUnreleased ? 'trailer' : (servers[0]?.id || '4animo-hd1');
    const [selectedServerId, setSelectedServerId] = useState(defaultServerId);
    const [reloadKey, setReloadKey] = useState(0);

    // Auto-save watch progress to library
    useEffect(() => {
        if (!anime?.id) return;

        const interval = setInterval(() => {
            LibraryApi.saveProgress({
                anime_id: anime.id,
                anime_title: animeTitle,
                image_url: anime.coverImage?.extraLarge || anime.coverImage?.large,
                banner_url: anime.bannerImage,
                episode_number: currentEpisode,
                episode_title: `Episode ${currentEpisode}`,
                progress_seconds: 300,
                duration_seconds: 1440,
                completed: false,
            }).catch(err => console.error('Failed to auto-save progress', err));
        }, 30000);

        return () => clearInterval(interval);
    }, [anime, currentEpisode, animeTitle]);

    // Listen to 4animo Player Events via window.postMessage
    useEffect(() => {
        const handlePlayerMessage = (event) => {
            let data = event.data;
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    return;
                }
            }

            if (data?.type === 'NEXT_EPISODE' && onNextEpisode) {
                onNextEpisode();
            } else if (data?.type === 'TIME_UPDATE' && data.currentTime && anime?.id) {
                // Auto-save precise progress from player
                LibraryApi.saveProgress({
                    anime_id: anime.id,
                    anime_title: animeTitle,
                    image_url: anime.coverImage?.extraLarge || anime.coverImage?.large,
                    banner_url: anime.bannerImage,
                    episode_number: currentEpisode,
                    episode_title: `Episode ${currentEpisode}`,
                    progress_seconds: Math.floor(data.currentTime),
                    duration_seconds: Math.floor(data.duration || 1440),
                    completed: data.currentTime >= (data.duration - 60),
                }).catch(() => {});
            }
        };

        window.addEventListener('message', handlePlayerMessage);
        return () => window.removeEventListener('message', handlePlayerMessage);
    }, [anime, currentEpisode, animeTitle, onNextEpisode]);

    // Synchronize mode when episode changes
    useEffect(() => {
        if (isUnreleased && trailerUrl) {
            setSelectedServerId('trailer');
        } else if (servers.length > 0 && !servers.some(s => s.id === selectedServerId)) {
            setSelectedServerId(servers[0].id);
        }
        setReloadKey(prev => prev + 1);
    }, [currentEpisode, streamData, isUnreleased, trailerUrl]);

    const handleReload = () => {
        setReloadKey(prev => prev + 1);
    };

    const activeServer = servers.find(s => s.id === selectedServerId) || servers[0] || {};
    const currentUrl = (selectedServerId === 'trailer' && trailerUrl)
        ? trailerUrl
        : (activeServer.url || streamData?.streamUrl || '');

    return (
        <div className="flex flex-col w-full bg-[#0d0f0f]">
            {/* Clean Player Header Toolbar */}
            <div className="bg-[#1a1c1c] border-b border-[#4d4635]/40 px-4 md:px-6 py-2.5 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#ffe9b0] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        {selectedServerId === 'trailer' ? 'Official PV Trailer' : `Playing Episode ${currentEpisode}`}
                    </span>

                    {/* Server Mirror Pills */}
                    {!isUnreleased && servers.length > 1 && (
                        <div className="flex items-center gap-1.5 bg-[#121414] p-1 rounded-lg border border-[#4d4635]/40 text-xs overflow-x-auto hide-scrollbar">
                            {servers.map((srv) => (
                                <button
                                    key={srv.id}
                                    onClick={() => setSelectedServerId(srv.id)}
                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                                        selectedServerId === srv.id
                                            ? 'bg-[#ffe9b0] text-[#241a00] font-bold shadow-[0_0_10px_rgba(255,233,176,0.3)]'
                                            : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                                    }`}
                                >
                                    <span>{srv.name}</span>
                                    {srv.badge && (
                                        <span className={`text-[9px] px-1 py-0.2 rounded uppercase ${
                                            selectedServerId === srv.id
                                                ? 'bg-[#241a00]/20 text-[#241a00]'
                                                : 'bg-white/10 text-[#d0c5af]'
                                        }`}>
                                            {srv.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={handleReload}
                        className="p-1 rounded text-[#99907c] hover:text-[#ffe9b0] hover:bg-[#282a2a] transition-colors cursor-pointer"
                        title="Reload video player"
                    >
                        <span className="material-symbols-outlined text-base">refresh</span>
                    </button>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#d0c5af]">
                    {currentUrl && (
                        <a
                            href={currentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#ffe9b0] hover:text-white flex items-center gap-1 bg-[#282a2a] px-2.5 py-1 rounded border border-[#4d4635]/40 transition-colors cursor-pointer text-[11px]"
                            title="Open in new window"
                        >
                            <span>Open in New Tab</span>
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                        </a>
                    )}

                    {streamData?.navigation?.hasPrevious && (
                        <button
                            onClick={onPrevEpisode}
                            className="hover:text-[#ffe9b0] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-sm">skip_previous</span>
                            <span>Prev</span>
                        </button>
                    )}

                    {streamData?.navigation?.hasNext && (
                        <button
                            onClick={onNextEpisode}
                            className="hover:text-[#ffe9b0] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            <span>Next</span>
                            <span className="material-symbols-outlined text-sm">skip_next</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Unreleased Warning Notice */}
            {isUnreleased && (
                <div className="bg-[#af8d11]/20 border-b border-[#f2ca50]/40 px-4 py-2.5 flex items-center justify-between text-xs text-[#ffe9b0]">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#f2ca50]">info</span>
                        <span>This anime is an upcoming title. Official broadcast episodes will release soon — stream the official PV trailer below!</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#f2ca50]/20 font-bold uppercase text-[10px]">
                        Upcoming
                    </span>
                </div>
            )}

            {/* Direct Video Player Display Container */}
            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden shadow-2xl">
                {currentUrl ? (
                    <iframe
                        key={`direct-player-${currentEpisode}-${selectedServerId}-${reloadKey}`}
                        src={currentUrl}
                        title={`Streaming ${animeTitle} Episode ${currentEpisode}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        className="w-full h-full border-0 absolute inset-0 z-10"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-6 text-[#d0c5af]">
                        <span className="material-symbols-outlined text-4xl text-[#ffe9b0] mb-2">videocam_off</span>
                        <p className="text-sm font-semibold">Video Stream Unavailable</p>
                        <p className="text-xs text-[#99907c] mt-1">Please check back later.</p>
                    </div>
                )}
            </div>

            {/* Bottom Stream Status */}
            <div className="bg-[#121414] px-4 py-2 border-t border-[#4d4635]/30 flex flex-wrap justify-between items-center text-xs text-[#99907c]">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Direct Stream: <strong className="text-[#e2e2e2] uppercase">{isUnreleased ? 'OFFICIAL HD TRAILER' : (activeServer.name || 'DIRECT HD STREAM')}</strong></span>
                </div>
                <div>
                    <span>Progress auto-saves to your library</span>
                </div>
            </div>
        </div>
    );
}
