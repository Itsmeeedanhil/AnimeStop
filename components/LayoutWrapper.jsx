'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith('/watch');

  return (
    <div className="flex flex-1 pt-16">
      {!isWatchPage && <Sidebar />}
      <main className={`flex-1 min-w-0 ${!isWatchPage ? 'xl:pl-60' : ''}`}>
        {children}
      </main>
    </div>
  );
}

