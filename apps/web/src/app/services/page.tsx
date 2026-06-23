'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, FileCheck2, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { RequiredDocument, Service } from '@connect/types';
import { PageLayout } from '../../components/layout/PageLayout';
import { Skeleton } from '../../components/Skeleton';
import apiClient from '../../services/apiClient';

function departmentName(service: Service) {
  return typeof service.department === 'string' ? 'General services' : service.department.name;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [documentCountByService, setDocumentCountByService] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadServices = async () => {
      setLoading(true);
      setError('');
      try {
          const response = await apiClient.get<Service[]>('/services');
          const loadedServices = response.data || [];

          if (!mounted) return;

          setServices(loadedServices);
          const counts = await Promise.allSettled(
            loadedServices.map((service) => apiClient.get<RequiredDocument[]>(`/services/${service._id}/documents`)),
          );

          setDocumentCountByService(
            loadedServices.reduce<Record<string, number>>((acc, service, index) => {
              const result = counts[index];
              acc[service._id] = result.status === 'fulfilled' ? result.value.data?.length ?? 0 : 0;
              return acc;
            }, {}),
          );
        } catch (err: any) {
          if (mounted) setError(err?.response?.data?.message || 'Unable to load services.');
        } finally {
          if (mounted) setLoading(false);
        }
    };

    loadServices();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return services;

    return services.filter((service) => {
      const haystack = `${service.name} ${service.description || ''} ${departmentName(service)}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, services]);

  const totalDocuments = Object.values(documentCountByService).reduce((sum, count) => sum + count, 0);

  return (
    <PageLayout>
          <section className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Service launchpad
                </div>
                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  Find the right government workflow in seconds.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  Browse verified services, understand document requirements, and start a guided upload flow with AI-assisted checks.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  { label: 'Live services', value: services.length, icon: Building2 },
                  { label: 'Required documents', value: totalDocuments, icon: FileCheck2 },
                  { label: 'Secure uploads', value: 'AI', icon: ShieldCheck },
                ].map((item) => (
                  <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-black tracking-tight text-slate-950">{item.value}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Services</h2>
              <p className="mt-1 text-sm text-slate-500">Select a service to begin the document checklist.</p>
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search services or departments"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <Skeleton height="h-10" width="w-10" className="rounded-2xl" />
                  <Skeleton height="h-5" width="w-3/4" className="mt-6" />
                  <Skeleton height="h-4" width="w-full" className="mt-4" />
                  <Skeleton height="h-4" width="w-2/3" className="mt-2" />
                </div>
              ))
            ) : error ? (
              <div className="col-span-full rounded-[2rem] border border-red-200 bg-red-50 p-10 text-center font-semibold text-red-700">{error}</div>
            ) : filteredServices.length === 0 ? (
              <div className="col-span-full rounded-[2rem] border border-slate-200 bg-white p-12 text-center">
                <p className="text-lg font-bold text-slate-950">No matching services</p>
                <p className="mt-2 text-sm text-slate-500">Try a different service name, department, or keyword.</p>
              </div>
            ) : (
              filteredServices.map((service) => (
                <Link
                  key={service._id}
                  href={`/service-detail/${service._id}`}
                  className="group flex min-h-[260px] flex-col rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_70px_rgba(37,99,235,0.14)]"
                >
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                      {documentCountByService[service._id] ?? 0} docs
                    </span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{departmentName(service)}</p>
                  <h3 className="mt-3 text-xl font-black leading-tight tracking-tight text-slate-950">{service.name}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                    {service.description || 'Start a guided application workflow and upload the required documents securely.'}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-6 text-sm font-bold text-blue-600">
                    Start workflow
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              ))
            )}
          </section>
    </PageLayout>
  );
}
