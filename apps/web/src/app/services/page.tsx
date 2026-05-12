'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import apiClient from '../../services/apiClient';
import { ArrowRight, LayoutList, Search } from 'lucide-react';
import { RequiredDocument, Service } from '@connect/types';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [documentCountByService, setDocumentCountByService] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await apiClient.get<Service[]>('/services');
        const loadedServices = response.data || [];
        setServices(loadedServices);

        const documentsResponses = await Promise.all(
          loadedServices.map((service) =>
            apiClient.get<RequiredDocument[]>(`/services/${service._id}/documents`),
          ),
        );

        const counts = loadedServices.reduce<Record<string, number>>((acc, service, index) => {
          acc[service._id] = documentsResponses[index].data?.length ?? 0;
          return acc;
        }, {});
        setDocumentCountByService(counts);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Unable to load services.');
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          <div className="flex items-center justify-between mb-10 gap-4">
            <div>
              <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">All Government Services</h2>
              <p className="text-slate-500 text-[15px] font-medium mt-1">Browse by service and upload documents for your chosen application.</p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search for services..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 focus:border-[#1D61FF] focus:ring-[#1D61FF]/20 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full rounded-[32px] border border-slate-100 bg-white p-10 text-center text-slate-500">Loading services...</div>
            ) : error ? (
              <div className="col-span-full rounded-[32px] border border-red-200 bg-red-50 p-10 text-center text-red-700">{error}</div>
            ) : services.length === 0 ? (
              <div className="col-span-full rounded-[32px] border border-slate-100 bg-white p-10 text-center text-slate-500">No services available yet.</div>
            ) : (
              services.map((service) => (
                <Link
                  key={service._id}
                  href={`/service-detail/${service._id}`}
                  className="group rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm transition-all hover:border-[#1D61FF] hover:shadow-xl"
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-3xl bg-[#EFF6FF] p-3 text-[#1D4ED8]">
                        <LayoutList className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.28em] text-slate-400 font-semibold">Department</p>
                        <h3 className="text-xl font-bold text-[#0F172A]">{typeof service.department === 'string' ? 'General' : service.department.name}</h3>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#1D61FF]" />
                  </div>
                  <h2 className="text-[20px] font-extrabold text-[#0F172A] mb-3">{service.name}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed">{service.description || 'Follow a guided flow and upload the documents required for this service.'}</p>
                  <p className="mt-4 text-sm font-semibold text-[#1D61FF]">
                    {documentCountByService[service._id] ?? 0} required documents
                  </p>
                </Link>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

