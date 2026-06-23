'use client';

import React from 'react';
import { Search, Bell, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useSidebar } from './SidebarContext';
import Link from 'next/link';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { toggleCollapsed, toggleMobileOpen } = useSidebar();

  const avatarSrc = user?.profileImage || (() => {
    if (user?.gender === 'male') {
      return 'https://api.dicebear.com/7.x/avataaars/svg?seed=Male&style=circle';
    }
    if (user?.gender === 'female') {
      return 'https://api.dicebear.com/7.x/avataaars/svg?seed=Female&style=circle';
    }
    if (user?.gender === 'other' || user?.gender === 'prefer_not') {
      return 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neutral&style=circle';
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || user?.email || 'guest'}`;
  })();

  const handleHamburgerClick = () => {
    if (window.innerWidth < 768) {
      toggleMobileOpen();
    } else {
      toggleCollapsed();
    }
  };

  return (
    <header className="h-[80px] border-b border-slate-100 bg-white sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 w-full">
      <div className="flex items-center flex-1 max-w-xl">
        {/* Responsive Hamburger Toggle Button */}
        <button 
          onClick={handleHamburgerClick}
          className="p-2 mr-2 text-slate-500 hover:text-[#1D61FF] hover:bg-slate-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D61FF]/20"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#1D61FF] transition-colors" />
          <input 
            type="text" 
            placeholder="Search for services, departments..."
            className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border border-slate-100 rounded-xl text-[14px] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#1D61FF]/10 focus:border-[#1D61FF] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6 ml-4">
        {/* Notifications Icon */}
        <button className="relative p-2.5 text-slate-400 hover:text-slate-900 transition-colors bg-[#F8FAFC] rounded-lg">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-white"></span>
        </button>

        {/* Profile Link */}
        <Link href="/settings" className="flex items-center gap-3 md:gap-4 pl-4 md:pl-6 border-l border-slate-100 group cursor-pointer">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-[#0F172A] leading-tight group-hover:text-[#1D61FF] transition-colors">
              {user?.name || user?.email || 'Guest User'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-none italic uppercase tracking-wider">
              {user?.role || 'User Account'}
            </p>
          </div>
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-slate-100 border-2 border-slate-50 overflow-hidden ring-2 ring-transparent group-hover:ring-[#1D61FF]/20 transition-all">
            <img 
              src={avatarSrc} 
              alt="User Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
        </Link>

        {/* Logout Button */}
        <button 
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-bold hidden md:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
