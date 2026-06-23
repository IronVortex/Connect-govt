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
        "group relative flex items-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1D61FF]/20",
        isCollapsed 
          ? "justify-center p-3 w-12 h-12 mx-auto" 
          : "gap-3 px-4 py-3 text-[14px] font-semibold w-full",
        isActive 
          ? "bg-[#1D61FF] text-white shadow-md shadow-[#1D61FF]/10" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className={cn(
        "w-5 h-5 flex-shrink-0 transition-colors", 
        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900"
      )} />
      
      {!isCollapsed && <span className="truncate">{label}</span>}

      {isCollapsed && (
        <div className="absolute left-full ml-3 px-3 py-2 bg-slate-950 text-white text-xs font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg pointer-events-none">
          {label}
          <div className="absolute top-1/2 -translate-y-1/2 right-full w-0 h-0 border-t-4 border-t-transparent border-r-4 border-r-slate-950 border-b-4 border-b-transparent"></div>
        </div>
      )}
    </Link>
  );
};
