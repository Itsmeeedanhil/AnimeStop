'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Library,
  Flame,
  Star,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  // Hide sidebar on full-screen player page for maximal cinema experience
  if (pathname?.startsWith('/watch')) {
    return null;
  }

  const navItems = [
    {
      label: 'Home',
      route: '/',
      icon: Home,
    },
    {
      label: 'My Library',
      route: '/library',
      icon: Library,
    },
    {
      label: 'Top Airing',
      route: '/search?sort=trending',
      icon: Flame,
    },
    {
      label: 'Popular Series',
      route: '/search?sort=popular',
      icon: Star,
    },
    {
      label: 'Genres Catalog',
      route: '/genres',
      icon: LayoutGrid,
    },
    {
      label: 'Search & Filter',
      route: '/search',
      icon: SlidersHorizontal,
    },
  ];

  const isActive = (itemRoute) => {
    if (itemRoute === '/' && pathname === '/') return true;
    if (itemRoute !== '/' && pathname.startsWith(itemRoute)) return true;
    return false;
  };

  return (
    <aside className="hidden xl:flex flex-col gap-2 py-4 bg-[#161818]/95 backdrop-blur-md fixed left-0 top-20 md:top-24 h-[calc(100vh-80px)] md:h-[calc(100vh-96px)] w-60 border-r border-[#4d4635]/40 z-40 overflow-y-auto custom-scrollbar shadow-xl pb-10">
      <div className="px-5 mb-1 pt-1">
        <span className="text-[11px] font-bold tracking-[0.15em] text-[#99907c] uppercase">
          Menu
        </span>
      </div>

      <div className="flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const active = isActive(item.route);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.route}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-left transition-all group ${
                active
                  ? 'text-[#241a00] bg-[#ffe9b0] font-bold shadow-[0_0_15px_rgba(255,233,176,0.25)]'
                  : 'text-[#d0c5af] hover:text-[#ffe9b0] hover:bg-[#202222]'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  active ? 'text-[#241a00]' : 'text-[#99907c] group-hover:text-[#ffe9b0]'
                }`}
              />
              <span className="text-xs tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Quick Genre Tags */}
      <div className="mt-6 px-5 border-t border-white/5 pt-5">
        <span className="text-[11px] font-bold tracking-[0.15em] text-[#99907c] uppercase block mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#ffe9b0]" />
          <span>Quick Genres</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {['Action', 'Fantasy', 'Romance', 'Sci-Fi', 'Comedy', 'Shonen', 'Mystery', 'Mecha'].map((genre) => (
            <Link
              key={genre}
              href={`/search?genre=${genre}`}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#121414] text-[#d0c5af] hover:text-[#ffe9b0] hover:bg-[#202222] border border-[#4d4635]/40 transition-colors"
            >
              {genre}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
