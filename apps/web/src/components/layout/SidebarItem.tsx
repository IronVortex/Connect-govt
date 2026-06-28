'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarContext';
import { cn } from '../../lib/utils';

interface SidebarItemProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ label, icon: Icon, href }) => {
  const pathname = usePathname();
  const { isCollapsed, closeMobile } = useSidebar();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={closeMobile}
      className={cn(
        "group relative flex items-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
        isCollapsed 
          ? "justify-center h-10 w-10 mx-auto rounded-lg" 
          : "gap-3 px-3 py-2.5 text-xs font-medium rounded-md w-full",
        isActive 
          ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-450" 
          : "text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      )}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >

      {isActive && !isCollapsed && (
        <span className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-r bg-blue-600" />
      )}

      <Icon className={cn(
        "w-4 h-4 flex-shrink-0 transition-colors duration-150", 
        isActive ? "text-blue-600 dark:text-blue-450" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-350"
      )} />
      
      {!isCollapsed && <span className="truncate tracking-wide">{label}</span>}

      {isCollapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-950 text-white text-[11px] font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-md pointer-events-none tracking-normal">
          {label}
        </div>
      )}
    </Link>
  );
};