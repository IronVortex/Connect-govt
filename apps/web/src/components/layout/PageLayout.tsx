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
    <div className="flex w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-250">
      <Sidebar />
  
      <div 
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out min-w-0",
          isCollapsed ? "md:pl-20" : "md:pl-[280px]"
        )}
      >
        <Topbar />
        
        <main className="flex-1 p-6 md:p-10 max-w-[1400px] mx-auto w-full">
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