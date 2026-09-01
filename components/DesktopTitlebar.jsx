'use client';

import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

export default function DesktopTitlebar() {
  const [isTauri, setIsTauri] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const runningInTauri = Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
      setIsTauri(runningInTauri);

      // Desktop keyboard hotkeys
      const handleKeyDown = (e) => {
        // F11: Toggle Fullscreen
        if (e.key === 'F11') {
          e.preventDefault();
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
          } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  if (!isTauri) return null;

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (e) {}
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch (e) {}
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (e) {}
  };

  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 left-0 right-0 h-8 bg-[#0d0f0f] border-b border-[#4d4635]/30 z-[9999] flex items-center justify-between px-3 select-none text-xs text-[#99907c]"
    >
      <div data-tauri-drag-region className="flex items-center gap-2">
        <img src="/favicon.svg" alt="AnimeStop" className="w-4 h-4 pointer-events-none" />
        <span className="font-bold text-[#ffe9b0] text-[11px] tracking-wide pointer-events-none">
          AnimeStop Desktop
        </span>
      </div>

      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="h-full px-3 hover:bg-white/10 text-[#d0c5af] hover:text-white transition-colors flex items-center justify-center cursor-pointer"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-3 hover:bg-white/10 text-[#d0c5af] hover:text-white transition-colors flex items-center justify-center cursor-pointer"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="h-full px-3 hover:bg-red-600 text-[#d0c5af] hover:text-white transition-colors flex items-center justify-center cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

