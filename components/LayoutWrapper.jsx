'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith('/watch');

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
