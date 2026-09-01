'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LibraryApi } from '@/lib/api';
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
} from 'lucide-react';

export default function VideoPlayer({ streamData, anime, currentEpisode, onNextEpisode, onPrevEpisode }) {
  const isUnreleased = streamData?.isUnreleased;
  const animeTitle = anime?.title?.english || anime?.title?.romaji || 'Anime';
  const trailerUrl = streamData?.trailerUrl;
  const servers = streamData?.servers || [];
  const animeId = parseInt(anime?.id || streamData?.animeId, 10);

  const defaultServerId = isUnreleased ? 'trailer' : (servers[0]?.id || '4animo-ani');
  const [selectedServerId, setSelectedServerId] = useState(defaultServerId);
  const [reloadKey, setReloadKey] = useState(0);
  const [adShieldActive, setAdShieldActive] = useState(true);

  // Custom SRT Subtitle State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subtitlesList, setSubtitlesList] = useState([]);
  const [subFileName, setSubFileName] = useState('');
  const [subOffset, setSubOffset] = useState(0); // seconds (+ or -)
  const [subFontSize, setSubFontSize] = useState('medium'); // small, medium, large, xlarge
  const [isSubEnabled, setIsSubEnabled] = useState(true);

  // Subtitle live playback clock (for custom SRT sync overlay)
  const [subCurrentTime, setSubCurrentTime] = useState(0);
  const [isSubTimerPlaying, setIsSubTimerPlaying] = useState(true);
  const subTimerRef = useRef(null);

  // Load any previously uploaded SRT for this anime & episode
  useEffect(() => {
    if (!animeId) return;
    try {
      const savedKey = `animestop_sub_${animeId}_${currentEpisode}`;
      const saved = localStorage.getItem(savedKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.cues && parsed.cues.length > 0) {
          setSubtitlesList(parsed.cues);
          setSubFileName(parsed.fileName || 'custom.srt');
          setSubOffset(parsed.offset || 0);
          setIsSubEnabled(true);
        }
      } else {
        setSubtitlesList([]);
        setSubFileName('');
        setSubOffset(0);
      }
    } catch (e) {
      console.warn('Failed to load local subtitles:', e);
    }
  }, [animeId, currentEpisode]);

  // Auto-fetch online subtitles in background if no local file exists
  useEffect(() => {
    if (!animeTitle || isUnreleased) return;

    const fetchAutoSubtitles = async () => {
      try {
        const res = await fetch(
          `/api/subtitles/auto?title=${encodeURIComponent(animeTitle)}&episode=${currentEpisode}&animeId=${animeId || ''}`
        );
        const data = await res.json();
        if (data?.success && data?.data?.content) {
          const parsedCues = parseSubtitles(data.data.content);
          if (parsedCues.length > 0) {
            setSubtitlesList((existing) => (existing.length === 0 ? parsedCues : existing));
            setSubFileName((existing) => (existing ? existing : data.data.fileName || 'Auto English Subtitles'));
            setIsSubEnabled(true);
            setIsSubTimerPlaying(true);
          }
        }
      } catch (err) {
        // Silently continue
      }
    };

    const savedKey = `animestop_sub_${animeId}_${currentEpisode}`;
    if (typeof window !== 'undefined' && !localStorage.getItem(savedKey)) {
      fetchAutoSubtitles();
    }
  }, [animeTitle, currentEpisode, animeId, isUnreleased]);

  // Subtitle playback interval timer (ticks every 250ms for smooth cue rendering)
  useEffect(() => {
    if (!isSubTimerPlaying || subtitlesList.length === 0 || !isSubEnabled) {
      if (subTimerRef.current) clearInterval(subTimerRef.current);
      return;
    }

    subTimerRef.current = setInterval(() => {
      setSubCurrentTime((prev) => prev + 0.25);
    }, 250);

    return () => {
      if (subTimerRef.current) clearInterval(subTimerRef.current);
    };
  }, [isSubTimerPlaying, subtitlesList, isSubEnabled]);

  // Handle local SRT / VTT file upload
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
          setIsSubTimerPlaying(true);

          // Save to local storage
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
          } catch (err) {
            console.warn('Could not save SRT to localStorage', err);
          }
        } else {
          alert('Could not detect valid subtitles in this file. Please ensure it is a valid .srt or .vtt file.');
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

  // Find currently active subtitle cue
  const effectiveTime = subCurrentTime + subOffset;
  const currentCue = isSubEnabled
    ? subtitlesList.find((c) => effectiveTime >= c.start && effectiveTime <= c.end)
    : null;

  // IMMEDIATELY save watch progress on load, then continuously update
  useEffect(() => {
    if (!animeId) return;

    const currentEpObj =
      streamData?.episodes?.find((e) => Number(e.number) === Number(currentEpisode)) ||
      streamData?.episodes?.[Number(currentEpisode) - 1];

    const epThumb = currentEpObj?.thumbnail || anime?.coverImage?.extraLarge || anime?.coverImage?.large;
    const epBanner = currentEpObj?.thumbnail || anime?.bannerImage || streamData?.banner || epThumb;
    const epTitle = currentEpObj?.title || `Episode ${currentEpisode}`;

    const recordProgress = (seconds = 10) => {
      LibraryApi.saveProgress({
        anime_id: animeId,
        anime_title: animeTitle,
        anime_image: epThumb,
        anime_banner: epBanner,
        episode_number: currentEpisode,
        episode_title: epTitle,
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
  }, [anime, currentEpisode, animeTitle, streamData, animeId]);

  const [autoRecoverNotice, setAutoRecoverNotice] = useState('');

  // Automatic Server Failover on error
  const handleAutoRecover = () => {
    if (servers.length > 1) {
      const currentIndex = servers.findIndex((s) => s.id === selectedServerId);
      const nextIndex = (currentIndex + 1) % servers.length;
      const nextServer = servers[nextIndex];
      setSelectedServerId(nextServer.id);
      setAutoRecoverNotice(`⚡ Auto-switched to backup mirror: ${nextServer.name}`);
      setTimeout(() => setAutoRecoverNotice(''), 5000);
    }
    setReloadKey((prev) => prev + 1);
  };

  // Listen for iframe / JW Player postMessage error signals (e.g. Error Code 232429) to auto-recover immediately
  useEffect(() => {
    const handleMessage = (e) => {
      const data = e.data;
      if (!data) return;
      try {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        const hasError =
          str.includes('232429') ||
          str.includes('232011') ||
          str.includes('233011') ||
          str.includes('224003') ||
          str.includes('234011') ||
          str.includes('102630') ||
          str.includes('102631') ||
          str.includes('cannot be played') ||
          str.includes('video file cannot be played') ||
          str.includes('jwplayerError') ||
          str.includes('MEDIA_ELEMENT_ERROR') ||
          str.includes('hlsError') ||
          str.includes('PLAYER_ERROR') ||
          (data.event === 'error' && data.code);

        if (hasError) {
          console.warn('Playback error code 232429 detected from embed stream, auto-switching to next server mirror...');
          handleAutoRecover();
        }
      } catch (err) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedServerId, servers]);

  // Synchronize server when episode changes
  useEffect(() => {
    if (isUnreleased && trailerUrl) {
      setSelectedServerId('trailer');
    } else if (servers.length > 0 && !servers.some((s) => s.id === selectedServerId)) {
      setSelectedServerId(servers[0].id);
    }
    setReloadKey((prev) => prev + 1);
  }, [currentEpisode, streamData, isUnreleased, trailerUrl]);

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
    setSubCurrentTime(0);
  };

  const activeServer = servers.find((s) => s.id === selectedServerId) || servers[0] || {};
  const currentUrl =
    selectedServerId === 'trailer' && trailerUrl
      ? trailerUrl
      : activeServer.url || streamData?.streamUrl || '';

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

            <button
              onClick={handleReload}
              className="p-1 rounded text-[#99907c] hover:text-[#ffe9b0] hover:bg-[#282a2a] transition-colors cursor-pointer shrink-0"
              title="Reload video player"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleAutoRecover}
              className="px-2 py-0.5 rounded bg-[#ffe9b0]/15 hover:bg-[#ffe9b0]/25 text-[#ffe9b0] text-[10px] font-bold border border-[#ffe9b0]/30 transition-all cursor-pointer shrink-0 flex items-center gap-1"
              title="Fix playback error & switch to next server"
            >
              <span>⚡ Auto-Fix</span>
            </button>
          </div>

          {autoRecoverNotice && (
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">
              {autoRecoverNotice}
            </span>
          )}

          <div className="flex items-center gap-2 sm:gap-3 text-xs text-[#d0c5af] shrink-0">
            {/* Custom SRT Subtitle Button */}
            <button
              onClick={() => setIsSubModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                subtitlesList.length > 0
                  ? 'bg-[#ffe9b0]/20 text-[#ffe9b0] border-[#ffe9b0]/50 shadow-[0_0_10px_rgba(255,233,176,0.2)]'
                  : 'bg-[#121414] text-[#d0c5af] hover:text-[#ffe9b0] border-[#4d4635]/40 hover:border-[#ffe9b0]/40'
              }`}
              title="Upload custom .SRT / .VTT subtitle file"
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span>{subtitlesList.length > 0 ? 'Custom Subs Active' : 'Add Subtitles (.SRT)'}</span>
            </button>

            {currentUrl && (
              <a
                href={currentUrl}
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
        {!isUnreleased && servers.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar w-full py-0.5">
            {servers.map((srv) => (
              <button
                key={srv.id}
                onClick={() => setSelectedServerId(srv.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  selectedServerId === srv.id
                    ? 'bg-[#ffe9b0] text-[#241a00] font-bold shadow-[0_0_10px_rgba(255,233,176,0.3)]'
                    : 'bg-[#121414] text-[#d0c5af] hover:text-[#ffe9b0] border border-[#4d4635]/40'
                }`}
              >
                <span>{srv.name}</span>
                {srv.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${
                      selectedServerId === srv.id
                        ? 'bg-[#241a00]/20 text-[#241a00]'
                        : 'bg-[#ffe9b0]/15 text-[#ffe9b0]'
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

      {/* Subtitle Notice Banner */}
      {!isUnreleased && (
        <div className="bg-gradient-to-r from-[#2a220e] via-[#1a1c1c] to-[#121414] border-b border-[#ffe9b0]/30 px-3 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-[#d0c5af]">
          <div className="flex items-start sm:items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#ffe9b0] shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-snug sm:leading-normal">
              <strong className="text-[#ffe9b0]">Notice:</strong> Subtitles work best on <strong className="text-white">Microsoft Edge</strong>. If using Chrome/Brave, click <button type="button" onClick={() => setIsSubModalOpen(true)} className="text-[#ffe9b0] underline font-bold hover:text-white cursor-pointer inline">Add Subtitles (.SRT)</button> to load subtitles directly.
            </span>
          </div>
          <span className="text-[10px] text-[#ffe9b0]/80 shrink-0 font-medium hidden md:inline">
            🔧 Subtitle Updates Ongoing
          </span>
        </div>
      )}

      {/* Custom Subtitle Floating Timing Sync Pill */}
      {subtitlesList.length > 0 && isSubEnabled && (
        <div className="bg-[#161818] border-b border-[#ffe9b0]/20 px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#d0c5af]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ffe9b0] animate-pulse"></span>
            <span className="text-[#ffe9b0] font-semibold truncate max-w-[180px] sm:max-w-xs">
              {subFileName} ({subtitlesList.length} cues)
            </span>
            <span className="text-[11px] text-[#99907c]">
              Timer: <strong className="text-white">{formatTimeCode(subCurrentTime)}</strong>
              {subOffset !== 0 && (
                <span className="text-[#ffe9b0] ml-1">
                  ({subOffset > 0 ? `+${subOffset}s` : `${subOffset}s`})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSubTimerPlaying(!isSubTimerPlaying)}
              className="p-1 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-[#d0c5af] transition-colors cursor-pointer"
              title={isSubTimerPlaying ? 'Pause subtitle clock' : 'Play subtitle clock'}
            >
              {isSubTimerPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>

            <button
              onClick={() => setSubCurrentTime(0)}
              className="p-1 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-[#d0c5af] transition-colors cursor-pointer"
              title="Reset subtitle timer to 00:00"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            <button
              onClick={() => setSubOffset((prev) => prev - 0.5)}
              className="px-1.5 py-0.5 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-[10px] font-bold text-[#d0c5af] cursor-pointer"
              title="Shift subtitles 0.5s earlier"
            >
              -0.5s
            </button>
            <button
              onClick={() => setSubOffset((prev) => prev + 0.5)}
              className="px-1.5 py-0.5 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-[10px] font-bold text-[#d0c5af] cursor-pointer"
              title="Delay subtitles 0.5s"
            >
              +0.5s
            </button>

            <button
              onClick={() => setIsSubModalOpen(true)}
              className="p-1 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-[#d0c5af] transition-colors cursor-pointer ml-1"
              title="Subtitle settings & sync"
            >
              <Sliders className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Direct Video Player Display Container */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden shadow-2xl">
        {/* First-click ad absorber */}
        {adShieldActive && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setAdShieldActive(false);
            }}
            className="absolute inset-0 z-30 cursor-pointer bg-transparent"
            title="Click to activate player"
          />
        )}

        {currentUrl ? (
          <iframe
            key={`direct-player-${currentEpisode}-${selectedServerId}-${reloadKey}`}
            src={currentUrl}
            title={`Streaming ${animeTitle} Episode ${currentEpisode}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
            allowFullScreen
            referrerPolicy="no-referrer"
            className="w-full h-full border-0 absolute inset-0 z-10"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 text-[#d0c5af]">
            <VideoOff className="w-10 h-10 text-[#ffe9b0] mb-2" />
            <p className="text-sm font-semibold">Video Stream Unavailable</p>
            <p className="text-xs text-[#99907c] mt-1">Please check back later or switch servers above.</p>
          </div>
        )}

        {/* Floating Instant Server Failover Switcher */}
        {!isUnreleased && servers.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAutoRecover();
            }}
            className="absolute top-3 right-3 z-30 px-3 py-1.5 rounded-xl bg-black/85 hover:bg-[#ffe9b0] text-[#ffe9b0] hover:text-[#241a00] text-xs font-bold border border-[#ffe9b0]/60 shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105"
            title="Video error 233429 or buffering? Click to switch to next high-speed server mirror"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>⚡ Fix: Switch Server</span>
          </button>
        )}

        {/* Custom Subtitle Overlay */}
        {currentCue && isSubEnabled && (
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

      {/* Stream Recovery Quick-Switch Bar */}
      <div className="bg-[#161818] border-t border-white/5 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#ffe9b0] flex items-center gap-1">
            <span>⚡ Stream Recovery:</span>
          </span>
          <button
            onClick={handleAutoRecover}
            className="px-3 py-1 rounded-lg bg-[#ffe9b0] text-[#241a00] text-xs font-extrabold hover:brightness-110 transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_10px_rgba(255,233,176,0.3)]"
            title="Auto-switch to next server mirror"
          >
            <span>Switch Next Server →</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#99907c] overflow-x-auto hide-scrollbar">
          <span className="shrink-0 font-medium">Select Mirror:</span>
          {servers.map((srv) => (
            <button
              key={srv.id}
              onClick={() => {
                setSelectedServerId(srv.id);
                setReloadKey((prev) => prev + 1);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                selectedServerId === srv.id
                  ? 'bg-[#ffe9b0] text-[#241a00] shadow-[0_0_10px_rgba(255,233,176,0.3)]'
                  : 'bg-[#121414] text-[#d0c5af] hover:text-[#ffe9b0] border border-white/10 hover:border-[#ffe9b0]/40'
              }`}
            >
              {srv.name}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Stream Status */}
      <div className="bg-[#121414] px-3 sm:px-4 py-2 border-t border-[#4d4635]/30 flex flex-wrap justify-between items-center text-[10px] sm:text-xs text-[#99907c] gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span>
            Stream:{' '}
            <strong className="text-[#e2e2e2] uppercase">
              {isUnreleased ? 'OFFICIAL HD TRAILER' : activeServer.name || 'DIRECT HD STREAM'}
            </strong>
          </span>
          <span className="text-[9px] text-[#2ebd85] font-semibold bg-[#2ebd85]/10 px-1.5 py-0.5 rounded">
            Ad-Shield Active
          </span>
        </div>
        <div>
          <span>Progress auto-saved</span>
        </div>
      </div>

      {/* Modal Section */}
      {isSubModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsSubModalOpen(false)}
        >
          <div
            className="relative w-[95vw] max-w-lg bg-[#161818] border border-[#ffe9b0]/40 rounded-2xl shadow-2xl p-5 sm:p-7 flex flex-col gap-5 my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#4d4635]/40 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ffe9b0]/15 text-[#ffe9b0] flex items-center justify-center">
                  <Subtitles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-['Bodoni_Moda'] text-lg font-bold text-[#e2e2e2]">
                    Custom Subtitles (.SRT / .VTT)
                  </h3>
                  <p className="text-xs text-[#99907c]">
                    Load your own subtitle file for Episode {currentEpisode}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSubModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1E2020] hover:bg-[#282a2a] text-[#99907c] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Option 1: URL */}
              <div className="p-3.5 rounded-xl bg-[#121414] border border-[#4d4635]/40 flex flex-col gap-2">
                <label className="text-xs font-bold text-[#e2e2e2] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-[#ffe9b0]" />
                    Option 1: Fetch From Subtitle URL / Link:
                  </span>
                  <span className="text-[10px] text-[#99907c]">.srt, .vtt, raw text</span>
                </label>

                <div className="flex gap-2">
                  <input
                    type="url"
                    id="custom-sub-url-input"
                    placeholder="https://example.com/subtitles/anime_ep1.srt"
                    className="flex-1 bg-[#1E2020] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-lg px-3 py-2 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={async (e) => {
                      const input = document.getElementById('custom-sub-url-input');
                      const url = input?.value?.trim();
                      if (!url) return alert('Please enter a valid subtitle URL.');
                      try {
                        const btn = e.currentTarget;
                        btn.innerText = 'Fetching...';
                        const res = await fetch('/api/subtitles/fetch', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ url }),
                        });
                        const data = await res.json();
                        if (data.success && data.data?.content) {
                          const parsedCues = parseSubtitles(data.data.content);
                          if (parsedCues.length > 0) {
                            setSubtitlesList(parsedCues);
                            setSubFileName(url.split('/').pop() || 'online_subs.srt');
                            setIsSubEnabled(true);
                            setSubCurrentTime(0);
                            setIsSubTimerPlaying(true);
                            try {
                              localStorage.setItem(
                                `animestop_sub_${animeId}_${currentEpisode}`,
                                JSON.stringify({
                                  fileName: url.split('/').pop() || 'online_subs.srt',
                                  cues: parsedCues,
                                  offset: subOffset,
                                })
                              );
                            } catch (e) {}
                            alert(`Success! Loaded ${parsedCues.length} subtitle cues.`);
                          } else {
                            alert('No valid subtitle cues found at this URL.');
                          }
                        } else {
                          alert(data.message || 'Failed to fetch subtitles from this link.');
                        }
                        btn.innerText = 'Fetch & Load';
                      } catch (err) {
                        alert('Failed to connect to subtitle link.');
                      }
                    }}
                    className="px-3 py-2 bg-[#ffe9b0] hover:bg-[#f2ca50] text-[#241a00] font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                  >
                    Fetch & Load
                  </button>
                </div>
              </div>

              {/* Option 2: Upload */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#e2e2e2] flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#ffe9b0]" />
                  Option 2: Upload .SRT or .VTT File:
                </label>

                <div className="border border-dashed border-[#4d4635] hover:border-[#ffe9b0] rounded-xl p-4 bg-[#121414] transition-all flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer relative">
                  <input
                    type="file"
                    accept=".srt,.vtt,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-6 h-6 text-[#ffe9b0]/60" />
                  <p className="text-xs text-[#e2e2e2] font-semibold">
                    Click to browse or drop your <span className="text-[#ffe9b0]">.srt</span> file here
                  </p>
                </div>

                {subFileName && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs mt-1">
                    <span className="flex items-center gap-1.5 font-medium truncate">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Loaded: {subFileName} ({subtitlesList.length} lines)
                    </span>
                    <button
                      onClick={handleClearSubtitles}
                      className="text-red-400 hover:text-red-300 text-[11px] underline shrink-0 cursor-pointer ml-2"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Option 3: Search shortcuts */}
              <div className="p-3.5 rounded-xl bg-[#1a1c1c] border border-white/5 flex flex-col gap-2.5">
                <label className="text-xs font-bold text-[#e2e2e2] flex items-center gap-1.5">
                  <Subtitles className="w-3.5 h-3.5 text-[#ffe9b0]" />
                  Find Free Subtitles Online (1-Click Search):
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <a
                    href={`https://www.opensubtitles.org/en/search/sublanguageid-eng/moviename-${encodeURIComponent(animeTitle + ' ' + currentEpisode)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#121414] hover:bg-[#282a2a] text-[#ffe9b0] text-[11px] font-semibold flex items-center justify-center gap-1 border border-[#4d4635]/40 transition-colors"
                  >
                    <span>OpenSubtitles</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <a
                    href={`https://subdl.com/search/${encodeURIComponent(animeTitle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#121414] hover:bg-[#282a2a] text-[#ffe9b0] text-[11px] font-semibold flex items-center justify-center gap-1 border border-[#4d4635]/40 transition-colors"
                  >
                    <span>Subdl Anime</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <a
                    href={`https://kitsunekko.net/dirlist.php?dir=subtitles%2Fjapanese%2F`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#121414] hover:bg-[#282a2a] text-[#ffe9b0] text-[11px] font-semibold flex items-center justify-center gap-1 border border-[#4d4635]/40 transition-colors"
                  >
                    <span>Kitsunekko</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Sync Settings */}
            <div className="flex flex-col gap-3 pt-2 border-t border-[#4d4635]/30">
              <h4 className="text-xs font-bold text-[#e2e2e2] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#ffe9b0]" />
                Subtitle Settings & Timing Sync:
              </h4>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#d0c5af]">Font Size:</span>
                <div className="flex gap-1 bg-[#121414] p-1 rounded-lg border border-[#4d4635]/40">
                  {['small', 'medium', 'large', 'xlarge'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSubFontSize(size)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        subFontSize === size
                          ? 'bg-[#ffe9b0] text-[#241a00] shadow'
                          : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 bg-[#121414] p-3 rounded-xl border border-[#4d4635]/30">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#d0c5af]">Current Subtitle Clock:</span>
                  <span className="text-[#ffe9b0] font-bold font-mono">
                    {formatTimeCode(subCurrentTime)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="range"
                    min="0"
                    max="1800"
                    step="1"
                    value={Math.floor(subCurrentTime)}
                    onChange={(e) => setSubCurrentTime(parseFloat(e.target.value))}
                    className="flex-1 accent-[#ffe9b0] cursor-pointer"
                  />
                </div>

                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className="text-[#99907c] text-[11px]">Sync Offset (Delay/Advance):</span>
                  <span className="text-white font-mono text-xs font-bold">
                    {subOffset > 0 ? `+${subOffset}s` : `${subOffset}s`}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  <button
                    onClick={() => setSubOffset((prev) => Math.round((prev - 1) * 10) / 10)}
                    className="px-2 py-1 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-xs font-semibold text-[#d0c5af] transition-colors cursor-pointer"
                  >
                    -1.0s
                  </button>
                  <button
                    onClick={() => setSubOffset((prev) => Math.round((prev - 0.5) * 10) / 10)}
                    className="px-2 py-1 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-xs font-semibold text-[#d0c5af] transition-colors cursor-pointer"
                  >
                    -0.5s
                  </button>
                  <button
                    onClick={() => setSubOffset((prev) => Math.round((prev + 0.5) * 10) / 10)}
                    className="px-2 py-1 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-xs font-semibold text-[#d0c5af] transition-colors cursor-pointer"
                  >
                    +0.5s
                  </button>
                  <button
                    onClick={() => setSubOffset((prev) => Math.round((prev + 1) * 10) / 10)}
                    className="px-2 py-1 rounded bg-[#282a2a] hover:bg-[#ffe9b0] hover:text-[#241a00] text-xs font-semibold text-[#d0c5af] transition-colors cursor-pointer"
                  >
                    +1.0s
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#4d4635]/40">
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#ffe9b0] hover:bg-[#f2ca50] text-[#241a00] font-bold text-xs shadow transition-all cursor-pointer"
              >
                Apply & Watch Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}