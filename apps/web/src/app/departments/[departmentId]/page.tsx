'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '../../../services/apiClient';
import { Sidebar } from '../../../components/Sidebar';
import { Topbar } from '../../../components/Topbar';
import { ArrowRight, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Department, Service } from '@connect/types';
import { getServicesForDepartment } from '../../../services/services';
import { useAuth } from '../../../lib/AuthContext';

const mongoObjectIdPattern = /^[a-f\d]{24}$/i;

function getDepartmentIdParam(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return '';
  }

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
  const departmentId = getDepartmentIdParam(
    params?.departmentId as string | string[] | undefined,
  );
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
      setError('Missing department id.');
      return;
    }

    setIsLoading(true);

    if (!mongoObjectIdPattern.test(departmentId)) {
      setError('Invalid department link. Please choose a department from the list.');
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
        setError(err?.response?.data?.message || 'Unable to load department details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [departmentId]);

  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          <div className="flex items-center gap-3 text-sm text-slate-500 mb-8">
            <Link href="/departments" className="text-[#1D61FF] hover:underline">Departments</Link>
            <ChevronRight className="w-4 h-4" />
            <span>{department?.name || 'Department'}</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-[32px] p-10 shadow-sm shadow-slate-200/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">{department?.name || 'Department details'}</h1>
                <p className="mt-3 text-slate-500 max-w-2xl">{department?.description || 'Browse available services and choose the right workflow for your document submission.'}</p>
              </div>
              <button onClick={() => router.back()} className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all font-semibold">
                Back to departments
              </button>
            </div>

            {isLoading ? (
              <div className="mt-12 text-center text-slate-500">Loading services...</div>
            ) : error ? (
              <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                {services.map((service) => (
                  <Link key={service._id} href={`/service-detail/${service._id}`} className="group block rounded-[24px] border border-slate-100 bg-slate-50 p-7 transition-all hover:border-[#1D61FF] hover:shadow-xl">
                    <h2 className="text-xl font-bold text-[#0F172A] group-hover:text-[#1D61FF]">{service.name}</h2>
                    <p className="mt-3 text-slate-500 text-sm leading-relaxed">{service.description || 'Complete this service workflow with the required documents.'}</p>
                    <div className="mt-6 inline-flex items-center gap-2 text-[#1D61FF] font-semibold">
                      Open Service
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
