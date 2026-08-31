'use client';

import React, { useState, useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { LibraryApi } from '@/lib/api';
import { resolveStreamSources } from '@/lib/clientStreamResolver';
import { parseSubtitles, formatTimeCode } from '@/lib/subtitles';
import {
  RefreshCw,
  ExternalLink,
  SkipBack,
  SkipForward,
  AlertCircle,
  VideoOff,
  Subtitles,
  Upload,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  X,
  Check,
  Tv,
  Sparkles,
} from 'lucide-react';

export default function VideoPlayer({ streamData, anime, currentEpisode, onNextEpisode, onPrevEpisode }) {
  const isUnreleased = streamData?.isUnreleased;
  const animeTitle = anime?.title?.english || anime?.title?.romaji || 'Anime';
  const trailerUrl = streamData?.trailerUrl;
  const servers = streamData?.servers || [];
  const animeId = parseInt(anime?.id || streamData?.animeId, 10);
  const malId = anime?.idMal || null;

  const defaultServerId = isUnreleased ? 'trailer' : (servers[0]?.id || '4animo-ani');
  const [selectedServerId, setSelectedServerId] = useState(defaultServerId);
  const [resolvedStream, setResolvedStream] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const artRef = useRef(null);
  const artInstanceRef = useRef(null);

  // Custom SRT Subtitle State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subtitlesList, setSubtitlesList] = useState([]);
  const [subFileName, setSubFileName] = useState('');
  const [subOffset, setSubOffset] = useState(0);
  const [subFontSize, setSubFontSize] = useState('medium');
  const [isSubEnabled, setIsSubEnabled] = useState(true);

  // Subtitle live playback clock (for custom SRT sync overlay fallback)
  const [subCurrentTime, setSubCurrentTime] = useState(0);
  const [isSubTimerPlaying, setIsSubTimerPlaying] = useState(true);

  // 1. Resolve direct HLS stream & subtitles via Client-Side Resolver Engine
  useEffect(() => {
    if (isUnreleased || !animeId) return;

    let serverType = 'ani';
    if (selectedServerId.includes('hd-1') || selectedServerId.includes('hd1')) serverType = 'hd-1';
    if (selectedServerId.includes('hd-2') || selectedServerId.includes('hd2')) serverType = 'hd-2';
    if (selectedServerId.includes('mal')) serverType = 'mal';

    let isMounted = true;
    setIsResolving(true);

    const loadStream = async () => {
      try {
        const streamInfo = await resolveStreamSources(animeId, currentEpisode, serverType, malId);
        if (isMounted) {
          if (streamInfo?.hlsUrl) {
            setResolvedStream(streamInfo);
          } else {
            setResolvedStream(null);
          }
        }
      } catch (err) {
        if (isMounted) setResolvedStream(null);
      } finally {
        if (isMounted) setIsResolving(false);
      }
    };

    loadStream();

    return () => {
      isMounted = false;
    };
  }, [animeId, currentEpisode, selectedServerId, isUnreleased, malId, reloadKey]);

  // 2. Initialize Native Artplayer when direct HLS stream is resolved
  useEffect(() => {
    if (isUnreleased || !artRef.current || !resolvedStream?.hlsUrl) return;

    const bannerUrl = anime?.bannerImage || streamData?.banner || anime?.coverImage?.extraLarge;
    const coverUrl = anime?.coverImage?.extraLarge || anime?.coverImage?.large || bannerUrl;

    try {
      if (artInstanceRef.current && artInstanceRef.current.destroy) {
        artInstanceRef.current.destroy(false);
      }

      const activeSub = resolvedStream.activeSubtitle;

      const art = new Artplayer({
        container: artRef.current,
        url: resolvedStream.hlsUrl,
        poster: bannerUrl || coverUrl,
        title: `${animeTitle} - Episode ${currentEpisode}`,
        theme: '#ffe9b0',
        volume: 0.85,
        isLive: false,
        muted: false,
        autoplay: true,
        autoOrientation: true,
        pip: true,
        autoSize: true,
        autoMini: true,
        screenshot: true,
        setting: true,
        loop: false,
        playbackRate: true,
        aspectRatio: true,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: true,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: true,
        airplay: true,
        hotkey: true,
        subtitle: activeSub
          ? {
              url: activeSub,
              type: 'vtt',
              style: {
                color: '#ffffff',
                fontSize: '24px',
                textShadow:
                  '0 0 4px #000, 0 0 8px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
              },
              encoding: 'utf-8',
            }
          : undefined,
        customType: {
          m3u8: function (video, url, artInstance) {
            if (Hls.isSupported()) {
              if (artInstance.hls) artInstance.hls.destroy();
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
              });
              hls.loadSource(url);
              hls.attachMedia(video);
              artInstance.hls = hls;
              artInstance.on('destroy', () => hls.destroy());
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = url;
            } else {
              artInstance.notice.show = 'Unsupported video format';
            }
          },
        },
      });

      // Continuous watch progress tracking to database
      art.on('video:timeupdate', () => {
        const currentTime = Math.floor(art.currentTime);
        const duration = Math.floor(art.duration) || 1440;
        if (currentTime > 5 && currentTime % 15 === 0) {
          LibraryApi.saveProgress({
            anime_id: animeId,
            anime_title: animeTitle,
            anime_image: coverUrl,
            anime_banner: bannerUrl,
            episode_number: currentEpisode,
            episode_title: `Episode ${currentEpisode}`,
            progress_seconds: currentTime,
            duration_seconds: duration,
            completed: currentTime >= duration * 0.9,
          }).catch(() => {});
        }
      });

      artInstanceRef.current = art;
    } catch (err) {
      console.warn('Native Artplayer initialization error:', err);
    }

    return () => {
      if (artInstanceRef.current && artInstanceRef.current.destroy) {
        artInstanceRef.current.destroy(false);
      }
    };
  }, [resolvedStream, isUnreleased, currentEpisode, animeId, animeTitle, streamData]);

  // Synchronize server on episode change
  useEffect(() => {
    if (isUnreleased && trailerUrl) {
      setSelectedServerId('trailer');
    } else if (servers.length > 0 && !servers.some((s) => s.id === selectedServerId)) {
      setSelectedServerId(servers[0].id);
    }
  }, [currentEpisode, streamData, isUnreleased, trailerUrl]);

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
    setSubCurrentTime(0);
  };

  const activeServer = servers.find((s) => s.id === selectedServerId) || servers[0] || {};
  const fallbackEmbedUrl =
    selectedServerId === 'trailer' && trailerUrl
      ? trailerUrl
      : activeServer.url || streamData?.streamUrl || '';

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const parsedCues = parseSubtitles(text);
        if (parsedCues.length > 0) {
          setSubtitlesList(parsedCues);
          setSubFileName(file.name);
          setIsSubEnabled(true);
          setSubCurrentTime(0);

          if (artInstanceRef.current?.subtitle) {
            const blob = new Blob([text], { type: 'text/vtt' });
            const blobUrl = URL.createObjectURL(blob);
            artInstanceRef.current.subtitle.switch(blobUrl, { name: file.name });
          }

          try {
            const savedKey = `animestop_sub_${animeId}_${currentEpisode}`;
            localStorage.setItem(
              savedKey,
              JSON.stringify({
                fileName: file.name,
                cues: parsedCues,
                offset: subOffset,
              })
            );
          } catch (err) {}
        } else {
          alert('Could not detect valid subtitles in this file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearSubtitles = () => {
    setSubtitlesList([]);
    setSubFileName('');
    setSubCurrentTime(0);
    try {
      localStorage.removeItem(`animestop_sub_${animeId}_${currentEpisode}`);
    } catch (e) {}
  };

  const effectiveTime = subCurrentTime + subOffset;
  const currentCue = isSubEnabled
    ? subtitlesList.find((c) => effectiveTime >= c.start && effectiveTime <= c.end)
    : null;

  const fontSizeClasses = {
    small: 'text-sm sm:text-base',
    medium: 'text-base sm:text-xl md:text-2xl',
    large: 'text-lg sm:text-2xl md:text-3xl font-bold',
    xlarge: 'text-xl sm:text-3xl md:text-4xl font-extrabold',
  }[subFontSize] || 'text-base sm:text-xl md:text-2xl';

  return (
    <div className="flex flex-col w-full max-w-full overflow-x-hidden bg-[#0d0f0f]">
      {/* Clean Player Header Toolbar */}
      <div className="bg-[#1a1c1c] border-b border-[#4d4635]/40 px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-[#ffe9b0] flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="truncate">
                {selectedServerId === 'trailer' ? 'Official PV Trailer' : `Ep ${currentEpisode}`}
              </span>
            </span>

            {resolvedStream?.hlsUrl && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                <Sparkles className="w-3 h-3" />
                <span>Zero-Ad Player Active</span>
              </span>
            )}

            <button
              onClick={handleReload}
              className="p-1 rounded text-[#99907c] hover:text-[#ffe9b0] hover:bg-[#282a2a] transition-colors cursor-pointer shrink-0"
              title="Reload video player"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs text-[#d0c5af] shrink-0">
            {/* Custom SRT Subtitle Button */}
            <button
              onClick={() => setIsSubModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                subtitlesList.length > 0 || resolvedStream?.activeSubtitle
                  ? 'bg-[#ffe9b0]/20 text-[#ffe9b0] border-[#ffe9b0]/50 shadow-[0_0_10px_rgba(255,233,176,0.2)]'
                  : 'bg-[#121414] text-[#d0c5af] hover:text-[#ffe9b0] border-[#4d4635]/40 hover:border-[#ffe9b0]/40'
              }`}
              title="Upload custom .SRT / .VTT subtitle file"
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span>
                {subtitlesList.length > 0
                  ? 'Custom Subs'
                  : resolvedStream?.activeSubtitle
                  ? 'English Sub (Active)'
                  : 'Add Subtitles (.SRT)'}
              </span>
            </button>

            {fallbackEmbedUrl && (
              <a
                href={fallbackEmbedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex text-[#ffe9b0] hover:text-white items-center gap-1 bg-[#282a2a] px-2.5 py-1 rounded border border-[#4d4635]/40 transition-colors cursor-pointer text-[11px]"
                title="Open in new window"
              >
                <span>New Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {onPrevEpisode && (
              <button
                onClick={onPrevEpisode}
                className="hover:text-[#ffe9b0] flex items-center gap-1 transition-colors cursor-pointer px-2 py-1 bg-[#121414] rounded border border-white/5 text-[11px]"
              >
                <SkipBack className="w-3 h-3" />
                <span>Prev</span>
              </button>
            )}

            {onNextEpisode && (
              <button
                onClick={onNextEpisode}
                className="hover:text-[#ffe9b0] flex items-center gap-1 transition-colors cursor-pointer px-2 py-1 bg-[#121414] rounded border border-white/5 text-[11px]"
              >
                <span>Next</span>
                <SkipForward className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Server Mirror Switcher Row */}
        {!isUnreleased && servers.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {servers.map((srv) => (
              <button
                key={srv.id}
                onClick={() => {
                  setSelectedServerId(srv.id);
                  setReloadKey((prev) => prev + 1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  selectedServerId === srv.id
                    ? 'bg-[#ffe9b0] text-[#241a00] border-[#ffe9b0] shadow-[0_0_12px_rgba(255,233,176,0.3)]'
                    : 'bg-[#121414] text-[#d0c5af] hover:text-[#ffe9b0] border-[#4d4635]/40 hover:border-[#ffe9b0]/40'
                }`}
              >
                <span>{srv.name}</span>
                {srv.badge && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded uppercase font-bold tracking-wider ${
                      selectedServerId === srv.id
                        ? 'bg-[#241a00]/15 text-[#241a00]'
                        : 'bg-[#282a2a] text-[#ffe9b0]'
                    }`}
                  >
                    {srv.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Video Player Container */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden shadow-2xl">
        {isResolving ? (
          <div className="flex flex-col items-center justify-center gap-3 text-[#ffe9b0]">
            <div className="w-10 h-10 border-4 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[#d0c5af]">Connecting to zero-ad high-speed stream...</p>
          </div>
        ) : resolvedStream?.hlsUrl ? (
          /* Real Native Artplayer Engine (0% Ads, 100% Subtitles) */
          <div ref={artRef} className="w-full h-full absolute inset-0 z-10" />
        ) : fallbackEmbedUrl ? (
          /* Fallback Direct Mirror Player */
          <iframe
            key={`direct-player-${currentEpisode}-${selectedServerId}-${reloadKey}`}
            src={fallbackEmbedUrl}
            title={`Streaming ${animeTitle} Episode ${currentEpisode}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            className="w-full h-full border-0 absolute inset-0 z-10"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 text-[#d0c5af]">
            <VideoOff className="w-10 h-10 text-[#ffe9b0] mb-2" />
            <p className="text-sm font-semibold">Video Stream Unavailable</p>
            <p className="text-xs text-[#99907c] mt-1">Please check back later or switch servers above.</p>
          </div>
        )}

        {/* Live Custom Subtitle Overlay (When custom SRT loaded) */}
        {!resolvedStream?.hlsUrl && currentCue && isSubEnabled && (
          <div className="absolute bottom-6 sm:bottom-10 left-4 right-4 z-20 pointer-events-none flex justify-center text-center">
            <div className="px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-lg bg-black/85 backdrop-blur-sm border border-black/40 shadow-2xl max-w-4xl animate-fade-in">
              <p
                className={`${fontSizeClasses} text-[#ffffff] font-semibold leading-snug tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,1)] select-none whitespace-pre-line`}
                style={{
                  textShadow: '0 0 4px #000, 0 0 8px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                }}
              >
                {currentCue.text}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stream Recovery Bar */}
      <div className="bg-[#161818] border-t border-white/5 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#99907c]">Having stream issues?</span>
          <button
            onClick={() => {
              if (servers.length > 1) {
                const currentIndex = servers.findIndex((s) => s.id === selectedServerId);
                const nextIndex = (currentIndex + 1) % servers.length;
                setSelectedServerId(servers[nextIndex].id);
              }
              setReloadKey((prev) => prev + 1);
            }}
            className="px-2.5 py-1 rounded bg-[#ffe9b0]/15 hover:bg-[#ffe9b0]/25 text-[#ffe9b0] text-[11px] font-bold border border-[#ffe9b0]/30 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>⚡ Switch Server Mirror</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#99907c]">
          <span>Mirrors:</span>
          {servers.map((srv) => (
            <button
              key={srv.id}
              onClick={() => {
                setSelectedServerId(srv.id);
                setReloadKey((prev) => prev + 1);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                selectedServerId === srv.id
                  ? 'bg-[#ffe9b0] text-[#241a00] font-bold'
                  : 'bg-[#121414] text-[#d0c5af] hover:text-[#ffe9b0] border border-white/5'
              }`}
            >
              {srv.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Subtitle Modal */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a1c1c] border border-[#ffe9b0]/30 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#4d4635]/30 pb-3">
              <div className="flex items-center gap-2 text-[#ffe9b0]">
                <Subtitles className="w-5 h-5" />
                <h3 className="font-bold text-base">Subtitles & Custom Tracks</h3>
              </div>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="p-1 rounded-lg text-[#99907c] hover:text-white hover:bg-[#282a2a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Box */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#d0c5af]">Upload .SRT / .VTT Subtitle File</label>
              <div className="border-2 border-dashed border-[#ffe9b0]/30 hover:border-[#ffe9b0] rounded-xl p-4 text-center cursor-pointer transition-all bg-[#121414]">
                <input
                  type="file"
                  accept=".srt,.vtt,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="sub-file-input"
                />
                <label htmlFor="sub-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-[#ffe9b0]" />
                  <span className="text-xs font-medium text-[#d0c5af]">
                    Click to select .srt / .vtt file
                  </span>
                  <span className="text-[10px] text-[#99907c]">Auto-attaches to native player</span>
                </label>
              </div>
            </div>

            {/* Subtitle Font Size Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#d0c5af]">Subtitle Font Size</label>
              <div className="grid grid-cols-4 gap-2">
                {['small', 'medium', 'large', 'xlarge'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSubFontSize(size)}
                    className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer border ${
                      subFontSize === size
                        ? 'bg-[#ffe9b0] text-[#241a00] border-[#ffe9b0]'
                        : 'bg-[#121414] text-[#d0c5af] hover:text-white border-white/5'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* 1-Click Online Repositories */}
            <div className="bg-[#121414] rounded-xl p-3 border border-white/5 flex flex-col gap-2">
              <span className="text-xs font-bold text-[#ffe9b0]">🔍 Search Subtitle Repositories:</span>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://www.opensubtitles.org/en/search/sublanguageid-eng/moviename-${encodeURIComponent(
                    animeTitle + ' episode ' + currentEpisode
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-xs font-medium text-[#d0c5af] transition-colors"
                >
                  OpenSubtitles
                </a>
                <a
                  href={`https://subdl.com/search?query=${encodeURIComponent(
                    animeTitle + ' ' + currentEpisode
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-xs font-medium text-[#d0c5af] transition-colors"
                >
                  Subdl Anime
                </a>
                <a
                  href={`https://kitsunekko.net/dirlist.php?dir=subtitles%2Fjapanese%2F`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-xs font-medium text-[#d0c5af] transition-colors"
                >
                  Kitsunekko
                </a>
              </div>
            </div>

            {subtitlesList.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-xs text-emerald-400 font-semibold">
                  ✓ {subFileName} ({subtitlesList.length} lines loaded)
                </span>
                <button
                  onClick={handleClearSubtitles}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer underline"
                >
                  Clear Subtitles
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}