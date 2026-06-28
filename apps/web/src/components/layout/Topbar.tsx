'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, LogOut, Menu, User, Settings, Lock } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useSidebar } from './SidebarContext';
import { ThemeToggle } from './ThemeToggle';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import Link from 'next/link';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { toggleCollapsed, toggleMobileOpen } = useSidebar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  const handleLogoutConfirm = async () => {
    setIsLogoutDialogOpen(false);
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 w-full select-none">
      <div className="flex items-center flex-1 max-w-xl">
        <button 
          onClick={handleHamburgerClick}
          className="p-1.5 mr-2 text-slate-500 dark:text-slate-400 hover:text-[#1D61FF] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D61FF]/20"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative group flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-[#1D61FF] transition-colors" />
          <input 
            type="text" 
            placeholder="Search for services, departments..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-xl text-xs font-medium placeholder:text-slate-400 dark:placeholder:text-slate-650 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-[#1D61FF]/10 focus:border-[#1D61FF] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 ml-4">
        {/* Global Theme Toggle */}
        <ThemeToggle />

        {/* Notifications Icon */}
        <button className="relative p-2 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full border border-white dark:border-slate-950"></span>
        </button>

        {/* Profile Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-4 border-l border-slate-200/80 dark:border-slate-800/80 group cursor-pointer focus:outline-none"
            aria-haspopup="true"
            aria-expanded={isDropdownOpen}
            aria-label="User profile menu"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-[#1D61FF] transition-colors">
                {user?.name || user?.email || 'Guest User'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 leading-none uppercase tracking-wider">
                {user?.role || 'User Account'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-250/60 dark:border-slate-800 overflow-hidden ring-2 ring-transparent group-hover:ring-[#1D61FF]/20 transition-all">
              <img 
                src={avatarSrc} 
                alt="User Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <Link 
                href="/settings" 
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                View Profile
              </Link>
              <Link 
                href="/settings" 
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Edit Profile
              </Link>
              <Link 
                href="/settings" 
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors border-b border-slate-100 dark:border-slate-800/60"
              >
                <Lock className="w-3.5 h-3.5" />
                Change Password
              </Link>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsLogoutDialogOpen(true);
                }}
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isLogoutDialogOpen}
        title="Sign Out"
        description="Are you sure you want to log out of ConnectGov? You will need to log back in to access your portal."
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleLogoutConfirm}
        onCancel={() => setIsLogoutDialogOpen(false)}
        isDestructive={true}
      />
    </header>
  );
};