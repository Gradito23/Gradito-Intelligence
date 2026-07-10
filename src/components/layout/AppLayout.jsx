import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PageSkeleton from '@/components/PageSkeleton';
import { SidebarLayoutProvider, useSidebarLayout } from './SidebarLayoutContext';
import { cn } from '@/lib/utils';

function MainContent() {
  const { collapsed } = useSidebarLayout();

  return (
    <main
      className={cn(
        'min-h-screen transition-[margin] duration-200',
        collapsed ? 'lg:ml-16' : 'lg:ml-60',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </div>
    </main>
  );
}

export default function AppLayout() {
  return (
    <SidebarLayoutProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MainContent />
      </div>
    </SidebarLayoutProvider>
  );
}
