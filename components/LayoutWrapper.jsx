'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith('/watch');

  // Automatic Human Visitor Tracking (fires on page navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const trackVisit = async () => {
      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': localStorage.getItem('animestop_session_id') || 'session_guest',
          },
          body: JSON.stringify({
            path: pathname || '/',
            referrer: document.referrer || '',
          }),
        });
      } catch (e) {}
    };

    trackVisit();
  }, [pathname]);

  return (
    <div className="flex flex-1 pt-16 min-h-screen">
      {!isWatchPage && <Sidebar />}
      <div className={`flex-1 flex flex-col min-w-0 ${!isWatchPage ? 'xl:pl-60' : ''}`}>
        <main className="flex-1 min-w-0">{children}</main>
        {!isWatchPage && <Footer />}
      </div>
    </div>
  );
}
