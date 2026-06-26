'use client';

import React, { useEffect, useState } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { ArrowRight, ChevronRight, Car, FileText, Landmark, Users, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/utils';
import apiClient from '../../services/apiClient';
import { Department, Service } from '@connect/types';
import { getServiceDepartmentId } from '../../services/services';
import { useAuth } from '../../lib/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';

const visuals = [
  { icon: Car, color: 'bg-blue-500/10 text-blue-600 border-blue-50' },
  { icon: FileText, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-50' },
  { icon: Landmark, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-50' },
  { icon: Users, color: 'bg-amber-500/10 text-amber-600 border-amber-50' },
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
        setError(err?.response?.data?.message || 'Unable to load departments.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDepartments();
  }, [authLoading, user]);

  return (
    <PageLayout>
      <div className="mb-8 space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Welcome back, {user?.name || 'User'}
        </h2>
        <p className="text-slate-500 text-xs font-medium">
          Select an organizational department below to browse or submit official service workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="animate-pulse bg-white border border-slate-200/60 rounded-xl p-5 space-y-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100" />
              <div className="space-y-2">
                <div className="h-4 w-2/3 bg-slate-100 rounded" />
                <div className="h-3 w-1/3 bg-slate-100 rounded" />
              </div>
              <div className="pt-2 h-3 w-1/2 bg-slate-50 rounded" />
            </div>
          ))
        ) : error ? (
          <div className="col-span-full">
            <Alert variant="error" title="Data Retrieval Error">{error}</Alert>
          </div>
        ) : (
          departments.map((dept, index) => {
            const visual = visuals[index % visuals.length];
            const Icon = visual.icon;
            const count = serviceCountByDepartment[dept._id] ?? 0;

            return (
              <Link
                key={dept._id}
                href={`/departments/${dept._id}`}
                className="group bg-white rounded-xl p-5 border border-slate-200/70 hover:border-blue-500 hover:shadow-sm transition-all duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className={cn(
                    'w-10 h-10 rounded-lg border flex items-center justify-center mb-4 transition-transform duration-150 group-hover:scale-105',
                    visual.color
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                    {dept.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    {count} {count === 1 ? 'service' : 'services'} ready for submission
                  </p>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center text-xs font-semibold text-blue-600">
                  <span>Explore workflows</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform duration-150" />
                </div>
              </Link>
            );
          })
        )}

        {!isLoading && !error && departments.length === 0 && (
          <div className="col-span-full text-center py-12 rounded-xl border border-dashed border-slate-200 bg-white">
            <p className="text-xs font-medium text-slate-400">No organizational divisions currently provisioned.</p>
          </div>
        )}
      </div>

      <div className="mt-12 rounded-xl border border-blue-100 bg-blue-50/40 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex gap-4 items-start sm:items-center">
          <div className="w-10 h-10 bg-blue-600 rounded-lg shrink-0 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Need assistance navigating portals?</h3>
            <p className="text-slate-500 text-xs max-w-md font-medium leading-normal">
              Take our interactive wizard step-by-step to automatically match requirements with corresponding document configurations.
            </p>
          </div>
        </div>
        
        <Button size="md" className="shrink-0 gap-1.5 self-start sm:self-auto">
          <span>Get Started Guide</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </PageLayout>
  );
}