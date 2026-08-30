'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0e0f0f] border-t border-white/5 pt-16 pb-12 mt-20 text-[#99907c]">
      <div className="max-w-[1920px] mx-auto px-4 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand Column */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <img
              src="/favicon.svg"
              alt="AnimeStop Logo"
              width={32}
              height={32}
              style={{ width: '32px', height: '32px', minWidth: '32px' }}
              className="w-8 h-8 rounded-lg shadow-[0_0_15px_rgba(255,233,176,0.35)]"
            />
            <span className="font-['Bodoni_Moda'] text-2xl font-bold tracking-tight text-[#ffe9b0]">
              AnimeStop
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[#99907c]">
            The definitive cinema-grade anime streaming sanctuary. Ultra-HD streaming with multi-provider failover, curated seasonal archives, and real-time cloud synchronisation.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[#e2e2e2] tracking-wider uppercase">Discover</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/" className="hover:text-[#ffe9b0] transition-colors">Featured Spotlight</Link></li>
            <li><Link href="/search?sort=trending" className="hover:text-[#ffe9b0] transition-colors">Trending Broadcasts</Link></li>
            <li><Link href="/search?format=TV" className="hover:text-[#ffe9b0] transition-colors">Television Series</Link></li>
            <li><Link href="/search?format=MOVIE" className="hover:text-[#ffe9b0] transition-colors">Theatrical Releases</Link></li>
            <li><Link href="/genres" className="hover:text-[#ffe9b0] transition-colors">Genre Catalog</Link></li>
          </ul>
        </div>

        {/* Library & Features */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[#e2e2e2] tracking-wider uppercase">Vault & Sanctuary</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/library" className="hover:text-[#ffe9b0] transition-colors">Personal Watchlist</Link></li>
            <li><Link href="/library" className="hover:text-[#ffe9b0] transition-colors">Playback Timestamps</Link></li>
            <li><Link href="/search?sort=score" className="hover:text-[#ffe9b0] transition-colors">Highest Rated</Link></li>
            <li><Link href="/search?season=WINTER&year=2026" className="hover:text-[#ffe9b0] transition-colors">Winter 2026 Season</Link></li>
          </ul>
        </div>

        {/* Disclaimer Column */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[#e2e2e2] tracking-wider uppercase">Legal Notice</h4>
          <p className="text-[11px] leading-relaxed">
            AnimeStop does not host any media files on its servers. All content is cataloged via AniList open metadata APIs and linked to third-party streaming media services.
          </p>
          <div className="pt-2 text-[11px] text-[#5e584a]">
            &copy; {new Date().getFullYear()} AnimeStop. Built with gold-standard performance.
          </div>
        </div>
      </div>
    </footer>
  );
}

