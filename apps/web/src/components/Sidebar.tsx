'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Grid, 
  Briefcase, 
  Wallet, 
  Bell, 
  HelpCircle, 
  Settings,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Departments', icon: Grid, href: '/departments' },
  { label: 'My Applications', icon: Briefcase, href: '/applications' },
  { label: 'Document Wallet', icon: Wallet, href: '/wallet' },
  { label: 'Notifications', icon: Bell, href: '/notifications' },
  { label: 'Help & Support', icon: HelpCircle, href: '/support' },
  { label: 'Profile Settings', icon: Settings, href: '/settings' },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] bg-white border-r border-slate-100 flex flex-col h-screen fixed left-0 top-0 z-40">
      <div className="px-6 py-8 flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center">
          <img src="/logo.svg" alt="Connect Logo" className="w-full h-full" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] leading-tight">Connect</h1>
          <p className="text-[10px] text-slate-400 font-medium leading-none">Your Gateway to Government Services</p>
        </div>
      </div>

      <nav className="flex-1 px-4 mt-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all duration-200",
                isActive 
                  ? "bg-[#F0F5FF] text-[#1D61FF]" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-[#1D61FF]" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-6">
        <div className="bg-[#FAFBFF] rounded-2xl p-5 border border-[#E9EFFF]">
          <div className="flex items-center gap-2 mb-2 text-[#10B981]">
            <ShieldCheck className="w-5 h-5 fill-current" />
            <span className="text-[11px] font-bold uppercase tracking-wide">Simple. Secure. Verified.</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            Connect makes it easy to access government services and get your documents verified quickly.
          </p>
        </div>
      </div>
    </aside>
  );
};
