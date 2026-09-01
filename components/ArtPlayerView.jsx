'use client';

import React, { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

export default function ArtPlayerView({ url, subtitleUrl, poster, onReady, onEnded, className = '' }) {
  const artRef = useRef(null);

  useEffect(() => {
    if (!artRef.current || !url) return;

    let artInstance = null;

    try {
      artInstance = new Artplayer({
        container: artRef.current,
        url: url,
        poster: poster || '',
        volume: 0.8,
        isLive: false,
        muted: false,
        autoplay: true,
        pip: true,
        autoSize: false,
        autoMini: true,
        screenshot: true,
        setting: true,
        loop: false,
        flip: true,
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
        theme: '#ffe9b0',
        lang: 'en',
        moreVideoAttr: {
          crossOrigin: 'anonymous',
        },
        subtitle: subtitleUrl
          ? {
              url: subtitleUrl,
              type: subtitleUrl.endsWith('.srt') ? 'srt' : 'vtt',
              style: {
                color: '#ffffff',
                fontSize: '22px',
                textShadow: '0 0 4px #000, 0 0 8px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                fontWeight: '600',
              },
              encoding: 'utf-8',
            }
          : undefined,
        customType: {
          m3u8: function (video, url, art) {
            if (Hls.isSupported()) {
              if (art.hls) art.hls.destroy();
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
              });
              hls.loadSource(url);
              hls.attachMedia(video);
              art.hls = hls;
              art.on('destroy', () => hls.destroy());
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = url;
            } else {
              art.notice.show = 'Unsupported video format: m3u8';
            }
          },
        },
        controls: [
          {
            position: 'right',
            html: '<span style="font-size: 11px; font-weight: bold; color: #ffe9b0; padding: 2px 6px; border: 1px solid rgba(255,233,176,0.4); border-radius: 4px;">AnimeStop HD</span>',
            tooltip: 'AnimeStop Native Cinema Engine',
          },
        ],
      });

      if (onReady) onReady(artInstance);
      if (onEnded) artInstance.on('video:ended', onEnded);
    } catch (err) {
      console.error('Failed to initialize Artplayer:', err);
    }

    return () => {
      if (artInstance && artInstance.destroy) {
        try {
          artInstance.destroy(false);
        } catch (e) {}
      }
    };
  }, [url, subtitleUrl, poster]);

  return (
    <div
      ref={artRef}
      className={`w-full h-full aspect-video bg-black overflow-hidden shadow-2xl relative ${className}`}
    />
  );
}

