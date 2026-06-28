'use client';

import React, { useState } from 'react';
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
  X,
  LogOut
} from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { SidebarItem } from './SidebarItem';
import { cn } from '../../lib/utils';
import { useAuth } from '../../lib/AuthContext';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

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
  const { logout } = useAuth();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const handleLogoutConfirm = async () => {
    setIsLogoutDialogOpen(false);
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 dark:bg-slate-950/50 backdrop-blur-xs z-40 md:hidden opacity-100 transition-opacity duration-300"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside 
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col h-screen transition-all duration-300 ease-in-out select-none",
          "w-[260px] -translate-x-full md:translate-x-0",
          isMobileOpen && "translate-x-0",
          isCollapsed ? "md:w-16" : "md:w-[260px]"
        )}
        aria-label="Main Navigation"
      >
        <div className={cn(
          "h-16 flex items-center border-b border-slate-100 dark:border-slate-800 transition-all duration-300 relative",
          isCollapsed ? "justify-center px-2" : "px-5 gap-2.5"
        )}>
          <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
            <img src="/logo.svg" alt="" className="w-4 h-4 object-contain invert" onError={(e) => e.currentTarget.remove()} />
          </div>
          
          {!isCollapsed && (
            <div className="transition-opacity duration-200 truncate pr-4">
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight leading-tight">ConnectGov</h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-normal mt-0.5">Secure Gateway</p>
            </div>
          )}

          <button 
            onClick={closeMobile}
            className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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

        {/* Pinned Sign Out Button */}
        <div className={cn(
          "p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50",
          isCollapsed && "px-2"
        )}>
          <button
            onClick={() => setIsLogoutDialogOpen(true)}
            className={cn(
              "group relative flex items-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500/20",
              isCollapsed 
                ? "justify-center h-10 w-10 mx-auto rounded-lg" 
                : "gap-3 px-3 py-2.5 text-xs font-semibold rounded-md w-full",
              "text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/20 dark:hover:text-red-400"
            )}
            aria-label="Sign Out"
          >
            <LogOut className={cn(
              "w-4 h-4 flex-shrink-0 transition-colors duration-150", 
              "text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400"
            )} />
            {!isCollapsed && <span className="truncate tracking-wide">Sign Out</span>}
            
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-950 text-white text-[11px] font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-md pointer-events-none tracking-normal">
                Sign Out
              </div>
            )}
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 transition-all duration-200">
            <div className="rounded-lg border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Verified Portal</span>
              </div>
              <p className="text-[11px] leading-normal text-slate-500 dark:text-slate-400 font-medium">
                End-to-end identity and verification processing security active.
              </p>
            </div>
          </div>
        )}
      </aside>

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
    </>
  );
};