'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isWatchPage = pathname?.startsWith('/watch');
  const lastTrackedPath = useRef(null);

  // Secret Admin Shortcut: Ctrl + Shift + A (or Alt + Shift + A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        router.push('/portal-secret-admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Accurate Human Visitor Tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Prevent duplicate triggers for the exact same page in short intervals
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

        const token = localStorage.getItem('animestop_auth_token');
        const headers = {
          'Content-Type': 'application/json',
          'X-Session-ID': localStorage.getItem('animestop_session_id') || 'session_guest',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        await fetch('/api/analytics/track', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            path: pathname || '/',
            title: typeof document !== 'undefined' ? document.title : '',
            referrer: document.referrer || '',
            clientSignals,
          }),
        });
      } catch (e) {}
    };

    trackVisit();

    // 20-second continuous active session heartbeat
    const interval = setInterval(trackVisit, 20000);
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <div className="flex flex-1 pt-20 md:pt-24 min-h-screen">
      {!isWatchPage && <Sidebar />}
      <div className={`flex-1 flex flex-col min-w-0 ${!isWatchPage ? 'xl:pl-60' : ''}`}>
        <main className="flex-1 min-w-0">{children}</main>
        {!isWatchPage && <Footer />}
      </div>
    </div>
  );
}
