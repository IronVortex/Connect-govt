'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '../../../services/apiClient';
import { PageLayout } from '../../../components/layout/PageLayout';
import { ChevronLeft, ChevronRight, FileCode } from 'lucide-react';
import Link from 'next/link';
import { Department, Service } from '@connect/types';
import { getServicesForDepartment } from '../../../services/services';
import { useAuth } from '../../../lib/AuthContext';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';

const mongoObjectIdPattern = /^[a-f\d]{24}$/i;

function getDepartmentIdParam(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return '';
  try {
    return decodeURIComponent(rawValue).trim();
  } catch {
    return rawValue.trim();
  }
}

export default function DepartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const departmentId = getDepartmentIdParam(params?.departmentId as string | string[] | undefined);
  
  const [department, setDepartment] = useState<Department | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;

    setDepartment(null);
    setServices([]);
    setError('');

    if (!departmentId) {
      setIsLoading(false);
      setError('Missing department identifier reference context.');
      return;
    }

    setIsLoading(true);

    if (!mongoObjectIdPattern.test(departmentId)) {
      setError('Invalid department reference address format. Please select an active option via the primary register.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [deptRes, departmentServices] = await Promise.all([
          apiClient.get(`/departments/${departmentId}`),
          getServicesForDepartment(departmentId),
        ]);
        setDepartment(deptRes.data);
        setServices(departmentServices);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Unable to load structural registry details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [departmentId, authLoading, user]);

  return (
    <PageLayout>
      {/* Route Traversal Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-6" aria-label="Breadcrumb">
        <Link href="/departments" className="hover:text-blue-600 transition-colors">Departments</Link>
        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
        <span className="text-slate-800 font-semibold truncate">{department?.name || 'Division Profile'}</span>
      </nav>

      {/* Main Structural Layout Content Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              {department?.name || 'Administrative Hub Registry'}
            </h1>
            <p className="text-xs font-medium leading-relaxed text-slate-500 max-w-2xl">
              {department?.description || 'Browse operations, audit schedules, and interactive utility channels configured through this specific branch workflow.'}
            </p>
          </div>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => router.back()} 
            className="gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Return to directory</span>
          </Button>
        </div>

        {/* Dynamic Inner Execution Area */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="animate-pulse border border-slate-100 bg-slate-50/50 rounded-xl p-5 space-y-3">
                <div className="h-4 w-1/2 bg-slate-200/60 rounded" />
                <div className="h-3 w-5/6 bg-slate-200/60 rounded" />
                <div className="h-3 w-1/3 bg-slate-200/40 rounded pt-2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-6">
            <Alert variant="error" title="Registry Fault">{error}</Alert>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            {services.map((service) => (
              <Link 
                key={service._id} 
                href={`/service-detail/${service._id}`} 
                className="group border border-slate-200/60 bg-slate-50/40 rounded-xl p-5 transition-all duration-150 hover:border-blue-500 hover:bg-white flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                    {service.name}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium leading-normal mt-1.5 mb-6">
                    {service.description || 'Initialize compliance processing sequence along with matching verification paperwork.'}
                  </p>
                </div>
                
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                  <span>Open workflow</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
                </div>
              </Link>
            ))}

            {services.length === 0 && (
              <div className="col-span-full text-center py-10 rounded-xl border border-dashed border-slate-200 bg-white">
                <p className="text-xs font-medium text-slate-400">No individual actions currently attached to this office.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}