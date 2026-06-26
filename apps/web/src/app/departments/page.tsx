'use client';

import React, { useEffect, useState } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { 
  Car, 
  FileText, 
  Landmark, 
  Users, 
  ChevronRight, 
  Search
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/utils';
import apiClient from '../../services/apiClient';
import { Department, Service } from '@connect/types';
import { getServiceDepartmentId } from '../../services/services';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

const visuals = [
  { icon: Car, color: 'bg-blue-500/10 text-blue-600 border-blue-50' },
  { icon: FileText, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-50' },
  { icon: Landmark, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-50' },
  { icon: Users, color: 'bg-amber-500/10 text-amber-600 border-amber-50' },
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [serviceCountByDepartment, setServiceCountByDepartment] = useState<
    Record<string, number>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
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
  }, []);

  const filteredDepartments = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q),
    );
  }, [query, departments]);

  return (
    <PageLayout>
      {/* Header Context Actions Segment Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Departments</h2>
          <p className="text-slate-500 text-xs font-medium">
            Browse structured public utility pipelines grouped by corresponding agency divisions.
          </p>
        </div>
        <div className="w-full sm:w-64 shrink-0">
          <Input
            id="department-filter"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agencies..."
            icon={<Search className="h-4 w-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Main Interactive Matrix Dashboard Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {isLoading ? (
          // Standard System Loading Blocks
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-slate-200/60 flex gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-3.5 pt-1">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-16" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-5/6" />
                </div>
                <div className="pt-2 h-3 bg-slate-50 rounded w-24" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="col-span-full">
            <Alert variant="error" title="Data Retrieval Error">{error}</Alert>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="col-span-full text-center py-12 rounded-xl border border-dashed border-slate-200 bg-white">
            <p className="text-xs font-medium text-slate-400">
              {query ? `No government departments match your query: "${query}"` : 'No administrative divisions configured.'}
            </p>
          </div>
        ) : (
          filteredDepartments.map((dept, index) => {
            const visual = visuals[index % visuals.length];
            const Icon = visual.icon;
            const count = serviceCountByDepartment[dept._id] ?? 0;

            return (
              <Link
                key={dept._id}
                href={`/departments/${dept._id}`}
                className="group bg-white rounded-xl p-5 border border-slate-200/70 hover:border-blue-500 hover:shadow-2xs transition-all duration-150 flex gap-4"
              >
                {/* Embedded Service Icon Frame */}
                <div className={cn(
                  'w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-102',
                  visual.color
                )}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Text Content Node */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight truncate">
                        {dept.name}
                      </h3>
                      <span className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200/60 shrink-0">
                        {count} {count === 1 ? 'Service' : 'Services'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium leading-normal line-clamp-2 mb-4">
                      {dept.description || 'Browse operations and active system tracking forms administered directly via this division.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-50 flex items-center text-xs font-semibold text-blue-600">
                    <span>Access services</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform duration-150" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </PageLayout>
  );
}