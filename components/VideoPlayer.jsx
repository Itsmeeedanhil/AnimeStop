'use client';

import React, { useState, useEffect } from 'react';
import { LibraryApi } from '@/lib/api';
import { RefreshCw, ExternalLink, SkipBack, SkipForward, AlertCircle, VideoOff } from 'lucide-react';

export default function VideoPlayer({ streamData, anime, currentEpisode, onNextEpisode, onPrevEpisode }) {
  const isUnreleased = streamData?.isUnreleased;
  const animeTitle = anime?.title?.english || anime?.title?.romaji || 'Anime';
  const trailerUrl = streamData?.trailerUrl;
  const servers = streamData?.servers || [];

  const defaultServerId = isUnreleased ? 'trailer' : (servers[0]?.id || '4animo-hd1');
  const [selectedServerId, setSelectedServerId] = useState(defaultServerId);
  const [reloadKey, setReloadKey] = useState(0);

  // IMMEDIATELY save watch progress on load, then continuously update
  useEffect(() => {
    const animeId = parseInt(anime?.id || streamData?.animeId, 10);
    if (!animeId) return;

    const bannerUrl = anime?.bannerImage || streamData?.banner || anime?.coverImage?.extraLarge;
    const coverUrl = anime?.coverImage?.extraLarge || anime?.coverImage?.large || bannerUrl;

    const recordProgress = (seconds = 10) => {
      LibraryApi.saveProgress({
        anime_id: animeId,
        anime_title: animeTitle,
        anime_image: coverUrl,
        anime_banner: bannerUrl,
        episode_number: currentEpisode,
        episode_title: `Episode ${currentEpisode}`,
        progress_seconds: seconds,
        duration_seconds: 1440,
        completed: false,
      }).catch(() => {});
    };

    recordProgress(15);

    const interval = setInterval(() => {
      recordProgress(300);
    }, 15000);

    return () => clearInterval(interval);
  }, [anime, currentEpisode, animeTitle, streamData]);

  // Synchronize server when episode changes
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
      {/* Player Header Toolbar */}
      <div className="bg-[#1a1c1c] border-b border-[#4d4635]/40 px-4 md:px-6 py-2.5 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#ffe9b0] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {selectedServerId === 'trailer' ? 'Official PV Trailer' : `Playing Episode ${currentEpisode}`}
          </span>

          {/* Server Selector */}
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
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleReload}
            className="p-1 rounded text-[#99907c] hover:text-[#ffe9b0] hover:bg-[#282a2a] transition-colors cursor-pointer"
            title="Reload stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
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
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {onPrevEpisode && (
            <button
              onClick={onPrevEpisode}
              className="hover:text-[#ffe9b0] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
          )}

          {onNextEpisode && (
            <button
              onClick={onNextEpisode}
              className="hover:text-[#ffe9b0] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Unreleased Warning Notice */}
      {isUnreleased && (
        <div className="bg-[#af8d11]/20 border-b border-[#f2ca50]/40 px-4 py-2.5 flex items-center justify-between text-xs text-[#ffe9b0]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#f2ca50]" />
            <span>This anime is an upcoming title. Official broadcast episodes will release soon — stream the official PV trailer below!</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#f2ca50]/20 font-bold uppercase text-[10px]">
            Upcoming
          </span>
        </div>
      )}

      {/* Direct Video Player Display Container with HTML5 Sandbox Popup Blocker */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden shadow-2xl">
        {currentUrl ? (
          <iframe
            key={`direct-player-${currentEpisode}-${selectedServerId}-${reloadKey}`}
            src={currentUrl}
            title={`Streaming ${animeTitle} Episode ${currentEpisode}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            className="w-full h-full border-0 absolute inset-0 z-10"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 text-[#d0c5af]">
            <VideoOff className="w-10 h-10 text-[#ffe9b0] mb-2" />
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
          <span className="text-[10px] text-[#2ebd85] font-semibold bg-[#2ebd85]/10 px-1.5 py-0.5 rounded">Ad-Shield Active</span>
        </div>
        <div>
          <span>Progress auto-saves to your library</span>
        </div>
      </div>
    </div>
  );
}
