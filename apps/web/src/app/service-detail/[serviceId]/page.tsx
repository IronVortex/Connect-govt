'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '../../../services/apiClient';
import { Sidebar } from '../../../components/Sidebar';
import { Topbar } from '../../../components/Topbar';
import { ArrowRight, CheckCircle2, Upload, FileText, Info, Clock, AlertCircle } from 'lucide-react';
import { RequiredDocument, Service, UploadedDocument, ApplicationSummary } from '@connect/types';

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params?.serviceId as string;
  const [service, setService] = useState<Service | null>(null);
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [uploads, setUploads] = useState<UploadedDocument[]>([]);
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (!serviceId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [serviceRes, docsRes, uploadsRes, summaryRes] = await Promise.all([
          apiClient.get(`/services/${serviceId}`),
          apiClient.get(`/documents/service/${serviceId}`),
          apiClient.get('/upload/me'),
          apiClient.get('/application-summary'),
        ]);
        setService(serviceRes.data);
        setDocuments(docsRes.data);
        setUploads(uploadsRes.data || []);
        setSummary(summaryRes.data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [serviceId]);

  const handleFileUpload = async (documentId: string, file: File | null) => {
    if (!file) return;
    setUploadError('');
    setUploadingId(documentId);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiClient.post(`/upload/${documentId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const [uploadsRes, summaryRes] = await Promise.all([
        apiClient.get('/upload/me'),
        apiClient.get('/application-summary'),
      ]);
      setUploads(uploadsRes.data);
      setSummary(summaryRes.data);
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          <div className="flex items-center gap-3 text-sm text-slate-500 mb-8">
            <Link href="/departments" className="text-[#1D61FF] hover:underline">Departments</Link>
            <ArrowRight className="w-4 h-4" />
            <span>{service?.name || 'Service'}</span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.8fr_1fr] gap-8">
            <section className="space-y-8">
              <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm shadow-slate-200/40">
                <div className="flex items-start gap-4 mb-6">
                  <div className="h-16 w-16 rounded-3xl bg-[#EEF2FF] flex items-center justify-center text-[#1D4ED8]">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">{service?.name || 'Service details'}</h1>
                    <p className="mt-2 text-slate-500 max-w-2xl">{service?.description || 'Choose the right documents to continue your application.'}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {loading ? (
                    <div className="py-12 text-center text-slate-500">Loading required documents...</div>
                  ) : documents.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">No required documents found for this service.</div>
                  ) : (
                    documents.map((document) => {
                      const currentUpload = uploads.find((upload) => upload.requiredDocument === document._id || (typeof upload.requiredDocument !== 'string' && upload.requiredDocument._id === document._id));
                      return (
                        <div key={document._id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                              <h2 className="text-xl font-bold text-[#0F172A]">{document.name}</h2>
                              <p className="mt-2 text-slate-500 text-sm">{document.description}</p>
                            </div>

                            <div className="flex flex-col gap-3 sm:items-end">
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#1D61FF] bg-white px-4 py-3 text-sm font-semibold text-[#1D61FF] shadow-sm hover:bg-[#EFF6FF] transition-colors">
                                Upload document
                                <input
                                  type="file"
                                  accept="application/pdf,image/png,image/jpeg"
                                  className="hidden"
                                  onChange={(event) => handleFileUpload(document._id, event.target.files?.[0] ?? null)}
                                />
                              </label>
                              {currentUpload ? (
                                <div className="text-sm font-semibold text-[#0F172A]">
                                  Status: <span className="text-[#1D61FF]">{currentUpload.detectionStatus}</span>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-500">Waiting for upload.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {uploadError && <div className="mt-6 rounded-3xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{uploadError}</div>}
              </div>

              <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm shadow-slate-200/40">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400 font-bold">Application progress</p>
                    <h2 className="text-2xl font-extrabold text-[#0F172A]">Overview</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#E0F2FE] px-4 py-2 text-sm font-semibold text-[#0369A1]">
                    <Clock className="w-4 h-4" /> Real-time update
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Uploaded', value: uploads.length },
                    { label: 'Detected', value: summary?.detected ?? 0 },
                    { label: 'Needs review', value: summary?.unknown ?? 0 },
                  ].map((tile) => (
                    <div key={tile.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-center">
                      <p className="text-sm text-slate-500">{tile.label}</p>
                      <p className="mt-3 text-3xl font-bold text-[#0F172A]">{tile.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm shadow-slate-200/40">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-3xl bg-[#F0FDF4] flex items-center justify-center text-[#16A34A]"><CheckCircle2 className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Ready to upload</p>
                    <h3 className="text-xl font-bold text-[#0F172A]">Document checklist</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">Each selection is validated instantly when you upload a document. Use a matching filename for faster detection.</p>
                  <ul className="mt-4 space-y-3">
                    {(summary?.tips || ['Upload clear scans', 'Use matching file names', 'Review status after upload']).map((tip, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-slate-600">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#1D61FF]" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-100 bg-[#F8FAFC] p-8 shadow-sm shadow-slate-200/40">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-3xl bg-[#EEF2FF] flex items-center justify-center text-[#1D4ED8]"><Info className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Status helper</p>
                    <h3 className="text-xl font-bold text-[#0F172A]">Detection guidance</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-600">Uploads are reviewed for expected document type and format. If the status is UNKNOWN, rename the file to include the type and re-upload.</p>
                <div className="mt-5 rounded-3xl bg-white p-5 border border-slate-100">
                  <p className="text-sm font-semibold text-slate-700">Expected types:</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>Passport</li>
                    <li>ID Card</li>
                    <li>Birth Certificate</li>
                    <li>Proof of Address</li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
