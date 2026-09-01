'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Megaphone, X, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load dismissed announcement IDs from localStorage
    try {
      const stored = localStorage.getItem('animestop_dismissed_announcements');
      if (stored) {
        setDismissedIds(JSON.parse(stored));
      }
    } catch (e) {}

    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`/api/announcements?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAnnouncements(json.data);
        }
      } catch (err) {
        // Silently continue
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('animestop_dismissed_announcements', JSON.stringify(updated));
    } catch (e) {}
  };

  const activeAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id)
  );

  if (isLoading || activeAnnouncements.length === 0) {
    return null;
  }

  // Display the latest active announcement
  const current = activeAnnouncements[0];

  return (
    <aside
      aria-label="Site Announcement"
      className="relative z-40 w-full bg-gradient-to-r from-[#241a00] via-[#1a1c1c] to-[#241a00] border-b border-[#ffe9b0]/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all animate-fadeIn"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Badge */}
          <span className="shrink-0 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#ffe9b0] text-[#241a00] tracking-wider shadow">
            {current.badge || 'ANNOUNCEMENT'}
          </span>

          {/* Title & Message */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            <span className="font-bold text-white shrink-0">
              {current.title}:
            </span>
            <span className="text-[#d0c5af] truncate">
              {current.message}
            </span>
          </div>

          {/* Optional Action Link */}
          {current.link_url && (
            <Link
              href={current.link_url}
              className="shrink-0 text-[11px] font-bold text-[#ffe9b0] hover:text-white flex items-center gap-1 ml-1 underline underline-offset-2 transition-colors"
            >
              <span>{current.link_text || 'Learn More'}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Dismiss Button */}
        {current.is_dismissible && (
          <button
            onClick={() => handleDismiss(current.id)}
            className="p-1 rounded-full text-[#99907c] hover:text-[#ffe9b0] hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
}

