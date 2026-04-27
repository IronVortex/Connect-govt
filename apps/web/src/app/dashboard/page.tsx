import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { ArrowRight, ChevronRight, Car, FileText, Landmark, Users, Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/utils';

const departments = [
  { name: 'Transport Department (RTO)', icon: Car, services: 12, color: 'bg-blue-500' },
  { name: 'Passport Seva', icon: FileText, services: 5, color: 'bg-indigo-500' },
  { name: 'Municipality', icon: Landmark, services: 24, color: 'bg-emerald-500' },
  { name: 'Revenue Department', icon: Users, services: 18, color: 'bg-amber-500' },
];

export default function DashboardPage() {
  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          <div className="mb-10">
            <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">Welcome back, Rohan</h2>
            <p className="text-slate-500 text-[15px] font-medium mt-1">Select a department to browse available services.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {departments.map((dept) => (
              <Link 
                key={dept.name} 
                href={`/departments/${dept.name.toLowerCase().replace(/ /g, '-')}`}
                className="group bg-white rounded-[24px] p-8 border border-slate-100 hover:border-[#1D61FF] hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg",
                  dept.color
                )}>
                  <dept.icon className="w-7 h-7" />
                </div>
                <h3 className="text-[20px] font-extrabold text-[#0F172A] group-hover:text-[#1D61FF] transition-colors tracking-tight">{dept.name}</h3>
                <p className="text-[14px] text-slate-400 mt-1.5 font-medium">{dept.services} Services available</p>
                <div className="mt-8 flex items-center text-[14px] font-bold text-[#1D61FF]">
                  View all services
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16 bg-[#EDF3FF] border border-[#1D61FF]/10 rounded-[24px] p-10 flex items-center justify-between shadow-sm">
            <div className="flex gap-6 items-center">
              <div className="w-16 h-16 bg-[#1D61FF] rounded-full flex items-center justify-center text-white shadow-xl shadow-[#1D61FF]/20">
                <Info className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-[22px] font-extrabold text-[#0F172A] tracking-tight">Not sure where to start?</h3>
                <p className="text-slate-500 mt-1 text-[15px] max-w-md font-medium">
                  Our guided process helps you find the right government service and required documents in minutes.
                </p>
              </div>
            </div>
            <button className="bg-[#1D61FF] text-white px-8 py-4 rounded-2xl font-bold text-[15px] flex items-center gap-3 hover:bg-[#1553DB] transition-all shadow-xl shadow-[#1D61FF]/30 active:scale-[0.98]">
              Get Started Guide
              <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
