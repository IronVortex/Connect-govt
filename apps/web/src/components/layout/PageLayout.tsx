'use client';

import React from 'react';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '../../lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
}

const LayoutContent: React.FC<PageLayoutProps> = ({ children }) => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex w-full min-h-screen bg-slate-50/50 antialiased selection:bg-blue-500/10">
      <Sidebar />
  
      <div 
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out min-w-0",
          isCollapsed ? "md:pl-16" : "md:pl-[260px]"
        )}
      >
        <Topbar />
        
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-[1400px] mx-auto w-full transition-all duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
};