'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { ArrowRight, ChevronRight, Car, FileText, Landmark, Users, Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/utils';
import apiClient from '../../services/apiClient';
import { Department, Service } from '@connect/types';
import { getServiceDepartmentId } from '../../services/services';
import { useAuth } from '../../lib/AuthContext';

const visuals = [
  { icon: Car, color: 'bg-blue-500' },
  { icon: FileText, color: 'bg-indigo-500' },
  { icon: Landmark, color: 'bg-emerald-500' },
  { icon: Users, color: 'bg-amber-500' },
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [serviceCountByDepartment, setServiceCountByDepartment] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;

    const loadDepartments = async () => {
      try {
        const departmentsRes = await apiClient.get<Department[]>('/departments');
        const servicesRes = await apiClient.get<Service[]>('/services');
        const loadedDepartments = departmentsRes.data || [];
        const loadedServices = servicesRes.data || [];
        setDepartments(loadedDepartments);

        const counts = loadedDepartments.reduce<Record<string, number>>(
          (acc, department) => {
            acc[department._id] = loadedServices.filter(
              (service) => getServiceDepartmentId(service) === department._id,
            ).length;
            return acc;
          },
          {},
        );
        setServiceCountByDepartment(counts);
      } catch (err: any) {
        console.error('[Dashboard departments failed]', err);
        setError(err?.response?.data?.message || 'Unable to load departments.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDepartments();
  }, []);

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
            {isLoading ? (
              <div className="col-span-full rounded-[24px] border border-slate-100 bg-white p-8 text-center text-slate-500">
                Loading departments...
              </div>
            ) : error ? (
              <div className="col-span-full rounded-[24px] border border-red-200 bg-red-50 p-8 text-center text-red-700">
                {error}
              </div>
            ) : (
              departments.map((dept, index) => {
                const visual = visuals[index % visuals.length];
                const Icon = visual.icon;

                return (
                  <Link
                    key={dept._id}
                    href={`/departments/${dept._id}`}
                    className="group bg-white rounded-[24px] p-8 border border-slate-100 hover:border-[#1D61FF] hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden"
                  >
                    <div
                      className={cn(
                        'w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg',
                        visual.color,
                      )}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-[20px] font-extrabold text-[#0F172A] group-hover:text-[#1D61FF] transition-colors tracking-tight">{dept.name}</h3>
                    <p className="text-[14px] text-slate-400 mt-1.5 font-medium">
                      {serviceCountByDepartment[dept._id] ?? 0} Services available
                    </p>
                    <div className="mt-8 flex items-center text-[14px] font-bold text-[#1D61FF]">
                      View all services
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })
            )}
            {!isLoading && !error && departments.length === 0 && (
              <div className="col-span-full rounded-[24px] border border-slate-100 bg-white p-8 text-center text-slate-500">
                No departments available yet.
              </div>
            )}
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
