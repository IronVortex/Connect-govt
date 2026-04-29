'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, FileText, Globe, UserCheck } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-sky-500 to-slate-100 opacity-40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <section className="space-y-8">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm shadow-slate-200 ring-1 ring-slate-200">
                <ShieldCheck className="h-4 w-4" />
                Modern government application workflow
              </div>

              <div className="space-y-6">
                <h1 className="max-w-3xl text-5xl font-extrabold tracking-tight text-slate-950 sm:text-6xl">
                  Submit services, upload documents, and track progress in one portal.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600">
                  Connect helps citizens find the right department, view service requirements, and submit application documents securely with intelligent file detection.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
                >
                  Explore services
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-950 hover:bg-slate-50 transition"
                >
                  Sign in
                </Link>
              </div>
            </section>

            <section className="grid gap-4">
              {[
                {
                  title: 'Smart document matching',
                  description: 'Auto-detect required files and show match status for each service.',
                  icon: FileText,
                },
                {
                  title: 'Service workflows',
                  description: 'Browse departments, services, and required documents in one place.',
                  icon: Globe,
                },
                {
                  title: 'Secure profiles',
                  description: 'Protected login for citizens and application history.',
                  icon: UserCheck,
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
                  <div className="flex items-center gap-4">
                    <div className="rounded-3xl bg-slate-100 p-4 text-slate-900">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">{item.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>

          <section className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Departments',
                value: '4',
                description: 'All relevant public service departments in one portal.',
              },
              {
                label: 'Services',
                value: '12+',
                description: 'Service-specific workflows with tailored document lists.',
              },
              {
                label: 'Document types',
                value: '7',
                description: 'Upload photos and PDFs for fast processing.',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/40">
                <p className="text-sm uppercase tracking-[.24em] text-slate-400">{item.label}</p>
                <p className="mt-4 text-4xl font-extrabold text-slate-950">{item.value}</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">{item.description}</p>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
