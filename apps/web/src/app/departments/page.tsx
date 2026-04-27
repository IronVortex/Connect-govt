'use client';

import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { 
  Car, 
  FileText, 
  Landmark, 
  Users, 
  ChevronRight, 
  ArrowRight,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/utils';

const departments = [
  { 
    id: 'rto',
    name: 'Transport Department (RTO)', 
    icon: Car, 
    services: 12, 
    color: 'bg-blue-500',
    description: 'Vehicle registration, driving licenses, and transport permits.'
  },
  { 
    id: 'passport',
    name: 'Passport Seva', 
    icon: FileText, 
    services: 5, 
    color: 'bg-indigo-500',
    description: 'New passport applications, renewals, and PCC services.'
  },
  { 
    id: 'municipality',
    name: 'Municipality', 
    icon: Landmark, 
    services: 24, 
    color: 'bg-emerald-500',
    description: 'Birth/Death certificates, property tax, and trade licenses.'
  },
  { 
    id: 'revenue',
    name: 'Revenue Department', 
    icon: Users, 
    services: 18, 
    color: 'bg-amber-500',
    description: 'Income certificates, caste certificates, and land records.'
  },
];

export default function DepartmentsPage() {
  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">Departments</h2>
              <p className="text-slate-500 text-[15px] font-medium mt-1">Browse services by government departments.</p>
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter departments..."
                  className="pl-11 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1D61FF]/10 focus:border-[#1D61FF] transition-all w-64"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {departments.map((dept) => (
              <Link 
                key={dept.id} 
                href={`/departments/${dept.id}`}
                className="group bg-white rounded-[24px] p-8 border border-slate-100 hover:border-[#1D61FF] hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex gap-6"
              >
                <div className={cn(
                  "w-20 h-20 rounded-[20px] flex items-center justify-center text-white flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform",
                  dept.color
                )}>
                  <dept.icon className="w-10 h-10" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[20px] font-extrabold text-[#0F172A] group-hover:text-[#1D61FF] transition-colors tracking-tight">{dept.name}</h3>
                    <span className="bg-slate-50 text-slate-500 text-[12px] font-bold px-3 py-1 rounded-full border border-slate-100">
                      {dept.services} Services
                    </span>
                  </div>
                  <p className="text-[14px] text-slate-400 font-medium mb-6 line-clamp-2">
                    {dept.description}
                  </p>
                  <div className="flex items-center text-[14px] font-bold text-[#1D61FF]">
                    Browse Services
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
