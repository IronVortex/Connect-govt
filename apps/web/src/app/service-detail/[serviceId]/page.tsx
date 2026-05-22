'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '../../../services/apiClient';
import { Sidebar } from '../../../components/Sidebar';
import { Topbar } from '../../../components/Topbar';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, FileText, Info, Upload } from 'lucide-react';
import { RequiredDocument, Service, UploadedDocument, ApplicationSummary } from '@connect/types';
import { useAuth } from '../../../lib/AuthContext';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FORMAT_LABEL = 'JPG, PNG, PDF';

function getRequiredDocumentId(upload: UploadedDocument) {
  return typeof upload.requiredDocument === 'string'
    ? upload.requiredDocument
    : upload.requiredDocument._id;
}

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params?.serviceId as string;
  const { user, loading: authLoading } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [documents, setDocuments] = useState<RequiredDocument[] | null>(null);
  const [uploads, setUploads] = useState<UploadedDocument[]>([]);
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [messageByDocumentId, setMessageByDocumentId] = useState<Record<string, { tone: 'success' | 'error'; text: string }>>({});
  const [toastMessage, setToastMessage] = useState('');
  const [statusByDocumentId, setStatusByDocumentId] = useState<
    Record<string, { status: 'DETECTED' | 'MISMATCH' | 'UNKNOWN'; documentType: string }>
  >({});

  const statusStyleMap: Record<'DETECTED' | 'MISMATCH' | 'UNKNOWN', string> = {
    DETECTED: 'bg-green-100 text-green-700 border-green-200',
    MISMATCH: 'bg-red-100 text-red-700 border-red-200',
    UNKNOWN: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  useEffect(() => {
    if (!serviceId || serviceId === '[serviceId]') return;

    console.log('[ServiceDetailPage] serviceId param:', serviceId);
    // Previously validated ObjectId format; removed to allow slugs or string IDs.
    // Backend will handle invalid IDs and error handling below.

    const load = async () => {
      setLoading(true);
      try {
        const [serviceRes, docsRes] = await Promise.all([
          apiClient.get(`/services/${serviceId}`),
          apiClient.get(`/services/${serviceId}/documents`),
        ]);
        console.log('Service API response:', serviceRes.data);
        console.log('RAW DOCUMENT RESPONSE', docsRes);
        console.log('RAW DOCUMENT DATA', docsRes.data);
        setService(serviceRes.data);

        let docsArray: RequiredDocument[] = [];
        if (Array.isArray(docsRes.data)) {
          docsArray = docsRes.data;
        } else if (docsRes.data && Array.isArray((docsRes.data as any).documents)) {
          docsArray = (docsRes.data as any).documents;
        } else {
          console.warn('[ServiceDetailPage] Unexpected documents response shape:', docsRes.data);
          docsArray = [];
        }

        setDocuments(docsArray);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [serviceId]);

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading && !user) {
        setUploads([]);
        setSummary(null);
      }
      return;
    }

    const loadUserUploadState = async () => {
      try {
        const [uploadsRes, summaryRes] = await Promise.all([
          apiClient.get('/upload/me'),
          apiClient.get('/application-summary'),
        ]);
        setUploads(uploadsRes.data || []);
        setSummary(summaryRes.data);
      } catch {
        setUploads([]);
        setSummary(null);
      }
    };

    loadUserUploadState();
  }, [authLoading, user]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => {
      setToastMessage('');
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleFileUpload = async (documentId: string, file: File | null) => {
    if (!file) return;
    setMessageByDocumentId((prev) => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });

    if (!user) {
      const text = 'Please sign in before uploading documents.';
      setMessageByDocumentId((prev) => ({ ...prev, [documentId]: { tone: 'error', text } }));
      setToastMessage(text);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      const text = 'Only JPG, PNG, and PDF files are supported.';
      setMessageByDocumentId((prev) => ({ ...prev, [documentId]: { tone: 'error', text } }));
      setToastMessage(text);
      return;
    }

    if (file.size >= MAX_UPLOAD_SIZE) {
      const text = 'File size must be less than 5MB.';
      setMessageByDocumentId((prev) => ({ ...prev, [documentId]: { tone: 'error', text } }));
      setToastMessage(text);
      return;
    }

    const document = documents?.find((item) => item._id === documentId) ?? null;
    setUploadingId(documentId);

    const formData = new FormData();
    formData.append('file', file);
    if (document?.name) {
      formData.append('expectedDocumentType', document.name);
    }
    try {
      const response = await apiClient.post(`/upload/${documentId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const payload = response.data as {
        detectedType: string;
        detectionStatus: 'DETECTED' | 'MISMATCH' | 'UNKNOWN';
      };

      setStatusByDocumentId((prev) => ({
        ...prev,
        [documentId]: {
          status: payload.detectionStatus,
          documentType: payload.detectedType,
        },
      }));
      setMessageByDocumentId((prev) => ({
        ...prev,
        [documentId]: {
          tone: 'success',
          text: `Uploaded successfully. Detection status: ${payload.detectionStatus}.`,
        },
      }));

      try {
        const [uploadsRes, summaryRes] = await Promise.all([
          apiClient.get('/upload/me'),
          apiClient.get('/application-summary'),
        ]);
        setUploads(uploadsRes.data || []);
        setSummary(summaryRes.data);
      } catch (err) {
        console.warn('Failed to refresh upload summary:', err);
      }
    } catch (err: any) {
      const text = err?.response?.data?.message || 'Upload failed. Please try again.';
      setMessageByDocumentId((prev) => ({ ...prev, [documentId]: { tone: 'error', text } }));
      setToastMessage(text);
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      {toastMessage && (
        <div className="fixed right-6 top-6 z-50 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg">
          {toastMessage}
        </div>
      )}
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

                <div className="overflow-hidden rounded-[24px] border border-slate-100">
                  {loading || documents === null ? (
                    <div className="py-12 text-center text-slate-500">Loading required documents...</div>
                  ) : documents.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">No required documents found for this service.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 bg-white">
                      <div className="hidden grid-cols-[minmax(0,1.5fr)_150px_170px_190px] gap-4 bg-slate-50 px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-slate-400 lg:grid">
                        <span>Document name</span>
                        <span>Formats</span>
                        <span>Upload status</span>
                        <span>Detection status</span>
                      </div>
                      {documents.map((document) => {
                        const currentUpload = uploads.find((upload) => getRequiredDocumentId(upload) === document._id);
                        const statusPayload = statusByDocumentId[document._id];
                        const status = statusPayload?.status || currentUpload?.detectionStatus;
                        const detectedType = statusPayload?.documentType || currentUpload?.detectedType;
                        const message = messageByDocumentId[document._id];
                        const hasUpload = Boolean(currentUpload || statusPayload);

                        return (
                          <div key={document._id} className="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1.5fr)_150px_170px_190px] lg:items-center">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#1D4ED8]">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <h2 className="truncate text-base font-bold text-[#0F172A]">{document.name || document._id}</h2>

                                  {(document.description || (document as any).allowedFormats) && (
                                    <p className="mt-1 text-sm text-slate-500">
                                      {document.description || (
                                        Array.isArray((document as any).allowedFormats)
                                          ? (document as any).allowedFormats.join(', ')
                                          : ''
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 lg:hidden">Formats</p>
                              <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                                {(Array.isArray((document as any).formats) && (document as any).formats.join(', ')) || (Array.isArray((document as any).allowedFormats) && (document as any).allowedFormats.join(', ')) || ACCEPTED_FORMAT_LABEL}
                              </span>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 lg:hidden">Upload status</p>
                              <label className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#1D61FF] bg-white px-4 py-2.5 text-sm font-semibold text-[#1D61FF] shadow-sm transition-colors hover:bg-[#EFF6FF]">
                                {uploadingId === document._id ? (
                                  'Uploading...'
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4" />
                                    {hasUpload ? 'Replace file' : 'Upload'}
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.pdf,application/pdf,image/png,image/jpeg"
                                  className="hidden"
                                  disabled={uploadingId === document._id}
                                  onChange={(event) => {
                                    handleFileUpload(document._id, event.target.files?.[0] ?? null);
                                    event.currentTarget.value = '';
                                  }}
                                />
                              </label>
                              {message && (
                                <p className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${message.tone === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                                  {message.tone === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                                  {message.text}
                                </p>
                              )}
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 lg:hidden">Detection status</p>
                              {status ? (
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${statusStyleMap[status]}`}>
                                    {status}
                                  </span>
                                  {detectedType && (
                                    <span className="text-xs font-medium text-slate-500">{detectedType}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
                                  Pending upload
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
