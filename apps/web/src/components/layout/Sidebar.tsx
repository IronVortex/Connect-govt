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
      {/* Overlay Backdrop for Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-100 flex flex-col h-screen transition-all duration-300 ease-in-out",
          // Mobile Drawer mode
          "w-[280px] -translate-x-full md:translate-x-0",
          isMobileOpen && "translate-x-0",
          // Desktop/Tablet collapse mode
          isCollapsed ? "md:w-20" : "md:w-[280px]"
        )}
        aria-label="Main Navigation"
      >
        {/* Branding & Logo */}
        <div className={cn(
          "py-6 flex items-center transition-all duration-300 ease-in-out relative",
          isCollapsed ? "justify-center px-2" : "px-6 gap-3"
        )}>
          <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            <img src="/logo.svg" alt="Connect Logo" className="w-full h-full" />
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-300 ease-in-out truncate pr-6">
              <h1 className="text-xl font-bold text-[#0F172A] leading-tight">Connect</h1>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Gateway to Govt Services</p>
            </div>
          )}

          {/* Close button for Mobile drawer */}
          <button 
            onClick={closeMobile}
            className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className={cn(
          "flex-1 mt-2 space-y-1 px-4",
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

        {/* Trust Badge at Footer */}
        {!isCollapsed && (
          <div className="p-6 transition-opacity duration-300 ease-in-out">
            <div className="bg-[#FAFBFF] rounded-2xl p-5 border border-[#E9EFFF]">
              <div className="flex items-center gap-2 mb-2 text-[#10B981]">
                <ShieldCheck className="w-5 h-5 fill-current flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Simple. Secure. Verified.</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Connect makes it easy to access government services and get your documents verified quickly.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
