'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith('/watch');
  const lastTrackedPath = useRef(null);

  // Accurate Human Visitor Tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;

    const trackVisit = async () => {
      try {
        const clientSignals = {
          webdriver: Boolean(navigator.webdriver),
          screenW: window.screen?.width || 0,
          screenH: window.screen?.height || 0,
          isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        };

        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': localStorage.getItem('animestop_session_id') || 'session_guest',
          },
          body: JSON.stringify({
            path: pathname || '/',
            referrer: document.referrer || '',
            clientSignals,
          }),
        });
      } catch (e) {}
    };

    trackVisit();
  }, [pathname]);

  return (
    <div className="flex flex-1 pt-16 min-h-screen w-full overflow-x-hidden">
      {!isWatchPage && <Sidebar />}
      <div className={`flex-1 flex flex-col min-w-0 w-full ${!isWatchPage ? 'xl:pl-60' : ''}`}>
        <main className="flex-1 min-w-0 w-full">{children}</main>
        {!isWatchPage && <Footer />}
      </div>
    </div>
  );
}
