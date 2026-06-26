'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search, Bell, ChevronRight, User } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { cn } from '../../lib/utils';

export const Topbar: React.FC = () => {
  const pathname = usePathname();
  const { toggleCollapsed, toggleMobileOpen } = useSidebar();

  const pathSegments = pathname.split('/').filter(Boolean);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-md transition-all duration-200">
      
    
      <div className="flex items-center gap-3 min-w-0">
      
        <button
          onClick={toggleMobileOpen}
          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-50 md:hidden transition-colors"
          aria-label="Open mobile navigation drawer"
        >
          <Menu className="h-4 w-4" />
        </button>

    
        <button
          onClick={toggleCollapsed}
          className="hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-50 md:block transition-colors"
          aria-label="Toggle navigation collapse"
        >
          <Menu className="h-4 w-4" />
        </button>

     
        <nav className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-400 min-w-0" aria-label="Breadcrumb">
          <span className="text-slate-500 font-semibold tracking-tight">ConnectGov</span>
          {pathSegments.map((segment, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />
              <span className={cn(
                "capitalize truncate max-w-[120px]",
                idx === pathSegments.length - 1 ? "text-slate-800 font-semibold" : "text-slate-400 font-medium"
              )}>
                {segment.replace(/-/g, ' ')}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

   
      <div className="flex items-center gap-4 shrink-0">
  
        <div className="relative hidden md:block w-56 lg:w-64 transition-all duration-200">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search platform controls..."
            className="w-full h-8 rounded-md border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        <button
          className="relative p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          aria-label="View platform notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

   
        <div className="h-4 w-px bg-slate-200" aria-hidden="true" />

        <button 
          className="flex items-center gap-2 rounded-lg p-1 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 group"
          aria-label="Open context user menu"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 border border-slate-200/60 text-slate-600 shadow-2xs group-hover:bg-slate-200/50 transition-colors">
            <User className="h-3.5 w-3.5" />
          </div>
        </button>
      </div>
    </header>
  );
};