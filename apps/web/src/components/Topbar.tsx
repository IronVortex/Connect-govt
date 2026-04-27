'use client';

import React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';

export const Topbar = () => {
  return (
    <header className="h-[80px] border-b border-slate-100 bg-white sticky top-0 z-30 flex items-center justify-between px-8 ml-[280px]">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#1D61FF] transition-colors" />
          <input 
            type="text" 
            placeholder="Search for services, departments..."
            className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border border-slate-100 rounded-xl text-[14px] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#1D61FF]/10 focus:border-[#1D61FF] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2.5 text-slate-400 hover:text-slate-900 transition-colors bg-[#F8FAFC] rounded-lg">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-4 pl-6 border-l border-slate-100 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-[#0F172A] leading-tight group-hover:text-[#1D61FF] transition-colors">Rohan Verma</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-none italic">User Account</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-slate-100 border-2 border-slate-50 overflow-hidden ring-2 ring-transparent group-hover:ring-[#1D61FF]/20 transition-all">
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan" 
              alt="User" 
              className="w-full h-full object-cover"
            />
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
        </div>
      </div>
    </header>
  );
};
