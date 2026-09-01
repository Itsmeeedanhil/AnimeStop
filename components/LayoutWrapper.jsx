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

  // Accurate Human Visitor Tracking & Instant Disconnect on Exit
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get or create unique tab session ID
    let tabSessionId = sessionStorage.getItem('animestop_tab_session');
    if (!tabSessionId) {
      tabSessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      sessionStorage.setItem('animestop_tab_session', tabSessionId);
    }

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
          'X-Session-ID': tabSessionId,
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

    // 12-second active heartbeat
    const interval = setInterval(trackVisit, 12000);

    // Instant disconnect when tab/app is closed or navigated away
    const handleLeave = () => {
      const sessId = sessionStorage.getItem('animestop_tab_session');
      if (sessId) {
        const payload = JSON.stringify({ session_id: sessId });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/leave', payload);
        } else {
          fetch('/api/analytics/leave', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', handleLeave);
    window.addEventListener('pagehide', handleLeave);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleLeave);
      window.removeEventListener('pagehide', handleLeave);
    };
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
