'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import apiClient from '../../services/apiClient';
import { ApplicationSummary } from '@connect/types';

export default function ApplicationsPage() {
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await apiClient.get('/application-summary');
        setSummary(response.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'You must be logged in to view applications.');
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, []);

  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          <div className="mb-10">
            <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">My Application Summary</h2>
            <p className="text-slate-500 text-[15px] font-medium mt-1">Track upload status and detection history for your active application.</p>
          </div>

          {loading ? (
            <div className="rounded-[32px] border border-slate-100 bg-white p-12 text-center text-slate-500">Loading your application summary...</div>
          ) : error ? (
            <div className="rounded-[32px] border border-red-200 bg-red-50 p-12 text-center text-red-700">{error}</div>
          ) : !summary ? (
            <div className="rounded-[32px] border border-slate-100 bg-white p-12 text-center text-slate-500">No application summary available.</div>
          ) : (
            <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
              <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm shadow-slate-200/40">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                  {[
                    { label: 'Total Documents', value: summary.totalDocuments },
                    { label: 'Detected', value: summary.detected },
                    { label: 'Unknown', value: summary.unknown },
                  ].map((item) => (
                    <div key={item.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-6 text-center">
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <p className="mt-3 text-4xl font-bold text-[#0F172A]">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-[#0F172A]">Recent uploads</h3>
                  {summary.uploads.length === 0 ? (
                    <p className="text-slate-500">No uploads yet. Visit a service and upload your documents to begin.</p>
                  ) : (
                    summary.uploads.map((upload) => (
                      <div key={upload._id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-[#0F172A]">{typeof upload.requiredDocument === 'string' ? upload.filename : upload.requiredDocument.name}</p>
                            <p className="text-sm text-slate-500 mt-1">Status: <span className="font-semibold">{upload.detectionStatus}</span></p>
                          </div>
                          <span className="text-sm text-slate-400">{new Date(upload.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-100 bg-[#F8FBFF] p-8 shadow-sm shadow-slate-200/40">
                <h3 className="text-xl font-bold text-[#0F172A] mb-4">Action tips</h3>
                <ul className="space-y-3 text-slate-600">
                  {summary.tips.map((tip, index) => (
                    <li key={index} className="rounded-3xl bg-white border border-slate-100 p-4">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
