'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Grid, 
  Briefcase, 
  FileText, 
  Wallet, 
  Bell, 
  HelpCircle, 
  Settings,
  ShieldCheck,
  X
} from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { SidebarItem } from './SidebarItem';
import { cn } from '../../lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Departments', icon: Grid, href: '/departments' },
  { label: 'Services', icon: Briefcase, href: '/services' },
  { label: 'My Applications', icon: FileText, href: '/applications' },
  { label: 'Document Wallet', icon: Wallet, href: '/wallet' },
  { label: 'Notifications', icon: Bell, href: '/notifications' },
  { label: 'Help & Support', icon: HelpCircle, href: '/support' },
  { label: 'Profile Settings', icon: Settings, href: '/settings' },
];

export const Sidebar: React.FC = () => {
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 md:hidden opacity-100 transition-opacity duration-300"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside 
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200/80 flex flex-col h-screen transition-all duration-300 ease-in-out select-none",
          "w-[260px] -translate-x-full md:translate-x-0",
          isMobileOpen && "translate-x-0",
          isCollapsed ? "md:w-16" : "md:w-[260px]"
        )}
        aria-label="Main Navigation"
      >
        <div className={cn(
          "h-16 flex items-center border-b border-slate-50 transition-all duration-300 relative",
          isCollapsed ? "justify-center px-2" : "px-5 gap-2.5"
        )}>
          <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
            <img src="/logo.svg" alt="" className="w-4 h-4 object-contain invert" onError={(e) => e.currentTarget.remove()} />
          </div>
          
          {!isCollapsed && (
            <div className="transition-opacity duration-200 truncate pr-4">
              <h1 className="text-sm font-semibold text-slate-900 tracking-tight leading-tight">ConnectGov</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-normal mt-0.5">Secure Gateway</p>
            </div>
          )}

         
          <button 
            onClick={closeMobile}
            className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

   
        <nav className={cn(
          "flex-1 py-4 space-y-0.5 overflow-y-auto scrollbar-none px-3",
          isCollapsed && "px-2"
        )}>
          {navItems.map((item) => (
            <SidebarItem 
              key={item.href}
              label={item.label}
              icon={item.icon}
              href={item.href}
            />
          ))}
        </nav>

        {!isCollapsed && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 transition-all duration-200">
            <div className="rounded-lg border border-slate-200/60 bg-white p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Verified Portal</span>
              </div>
              <p className="text-[11px] leading-normal text-slate-500 font-medium">
                End-to-end identity and verification processing security active.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};