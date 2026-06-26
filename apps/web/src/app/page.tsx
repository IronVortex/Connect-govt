'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, FileText, Globe, UserCheck } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-sky-500/10 selection:text-sky-700">
      <main className="relative overflow-hidden">
\        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-sky-400 to-transparent opacity-20 blur-3xl pointer-events-none" />
        
        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            
            
            <section className="space-y-8">
              <div className="inline-flex items-center gap-2.5 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-sky-700 shadow-sm shadow-slate-200/60 ring-1 ring-slate-200/80 backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                Modern government application workflow
              </div>

              <div className="space-y-6">
                <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl leading-[1.1]">
                  Submit services, upload documents, and track progress in one portal.
                </h1>
                <p className="max-w-2xl text-[17px] font-medium leading-relaxed text-slate-500">
                  Connect helps citizens find the right department, view service requirements, and submit application documents securely with intelligent file detection.
                </p>
              </div>

              <div className="flex flex-col gap-3.5 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-2xl bg-[#0F172A] px-8 py-4 text-base font-bold text-white shadow-lg shadow-slate-950/10 transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                >
                  Explore services
                  <ArrowRight className="ml-2.5 h-5 w-5" />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 hover:bg-slate-50 transition-all duration-200 active:scale-[0.98] shadow-sm shadow-slate-100"
                >
                  Sign in
                </Link>
              </div>
            </section>

            {/* Right Feature Cards Column */}
            <section className="grid gap-4">
              {[
                {
                  title: 'Smart document matching',
                  description: 'Auto-detect required files and show match status for each service workflow.',
                  icon: FileText,
                  bg: 'bg-blue-50',
                  color: 'text-blue-600'
                },
                {
                  title: 'Service workflows',
                  description: 'Browse departments, services, and required document rules seamlessly in one place.',
                  icon: Globe,
                  bg: 'bg-indigo-50',
                  color: 'text-indigo-600'
                },
                {
                  title: 'Secure profiles',
                  description: 'Protected authentication structures tailored for citizens and fast dynamic application lookups.',
                  icon: UserCheck,
                  bg: 'bg-emerald-50',
                  color: 'text-emerald-600'
                },
              ].map((item) => (
                <div 
                  key={item.title} 
                  className="group rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm shadow-slate-200/40 hover:shadow-md hover:border-slate-200/60 transition-all duration-200"
                >
                  <div className="flex items-center gap-5">
                    <div className={`rounded-2xl ${item.bg} p-4 ${item.color} shrink-0 transition-colors group-hover:scale-105 duration-200`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 group-hover:text-slate-950 transition-colors">{item.title}</h2>
                      <p className="mt-0.5 text-sm font-medium leading-normal text-slate-400">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>

          <section className="mt-16 grid gap-5 sm:grid-cols-3">
            {[
              {
                label: 'Departments',
                value: '4',
                description: 'All relevant public service departments nested in one clear portal layout.',
              },
              {
                label: 'Services',
                value: '12+',
                description: 'Service-specific workflows featuring fine-tuned structured document checks.',
              },
              {
                label: 'Document types',
                value: '7',
                description: 'Upload native image formats and PDF files for immediate, fast AI parsing structures.',
              },
            ].map((item) => (
              <div 
                key={item.label} 
                className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm shadow-slate-200/40 hover:shadow-md transition-all duration-200"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <p className="mt-3 text-4xl font-extrabold text-[#0F172A] tracking-tight">{item.value}</p>
                <p className="mt-2 text-[13px] font-medium leading-relaxed text-slate-400">{item.description}</p>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}