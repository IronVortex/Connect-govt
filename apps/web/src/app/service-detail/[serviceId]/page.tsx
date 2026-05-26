'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  CloudUpload,
  ExternalLink,
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Application, ApplicationSummary, RequiredDocument, Service, UploadedDocument } from '@connect/types';
import { Badge } from '../../../components/Badge';
import { UploadCard } from '../../../components/UploadCard';
import { Sidebar } from '../../../components/Sidebar';
import { Skeleton } from '../../../components/Skeleton';
import { Topbar } from '../../../components/Topbar';
import { useAuth } from '../../../lib/AuthContext';
import { cn } from '../../../lib/utils';
import apiClient from '../../../services/apiClient';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FORMAT_LABEL = 'JPG, PNG, PDF';

type DetectionStatus = 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'NEEDS_REVIEW' | 'DETECTED';
type UploadState = {
  fileName?: string;
  progress: number;
  message?: string;
  tone?: 'success' | 'error';
  status?: DetectionStatus;
  detectedType?: string;
  confidence?: number;
  reasons?: string[];
};

function getRequiredDocumentId(upload: UploadedDocument) {
  return typeof upload.requiredDocument === 'string' ? upload.requiredDocument : upload.requiredDocument._id;
}

function formatBytes(size: number) {
  if (!size) return '0 KB';
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function normalizeUploadResponse(data: any): { 
  status: DetectionStatus; 
  detectedType: string;
  confidence?: number;
  reasons?: string[];
} {
  return {
    status: data?.detectionStatus || data?.status || 'UNKNOWN',
    detectedType: data?.detectedType || data?.documentType || 'Unknown',
    confidence: data?.confidence,
    reasons: data?.detectionReasons,
  };
}

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params?.serviceId as string;
  const { user, loading: authLoading } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [uploads, setUploads] = useState<UploadedDocument[]>([]);
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [uploadStateByDocumentId, setUploadStateByDocumentId] = useState<Record<string, UploadState>>({});
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');

  // Application state
  const [application, setApplication] = useState<Application | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUserUploadState = useCallback(async () => {
    if (!user) {
      setUploads([]);
      setSummary(null);
      return;
    }

    try {
      const [uploadsRes, summaryRes] = await Promise.all([
        apiClient.get('/upload/me'),
        apiClient.get('/application-summary'),
      ]);
      setUploads(uploadsRes.data || []);
      setSummary(summaryRes.data || null);
    } catch (err: any) {
      // if unauthorized, signal auth context to handle redirect
      if (err?.response?.status === 401) {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('connect:unauthorized'));
      }
      setUploads([]);
      setSummary(null);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    if (!serviceId || serviceId === '[serviceId]') return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [serviceRes, docsRes] = await Promise.all([
          apiClient.get(`/services/${serviceId}`),
          apiClient.get(`/services/${serviceId}/documents`),
        ]);

        if (!mounted) return;
        const docsData = docsRes.data;
        setService(serviceRes.data);
        setDocuments(Array.isArray(docsData) ? docsData : docsData?.documents || []);
      } catch (err: any) {
        if (mounted) setError(err?.response?.data?.message || 'Unable to load this service.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [serviceId]);

  // Load existing application for this service
  const loadApplication = useCallback(async () => {
    if (!user || !serviceId) return;
    try {
      const res = await apiClient.get<Application[]>('/applications');
      const apps: Application[] = res.data ?? [];
      const existing = apps.find((a) => {
        const svcId = typeof a.service === 'string' ? a.service : a.service._id;
        return svcId === serviceId && !a.deletedAt;
      });
      setApplication(existing ?? null);
    } catch {
      // silently fail — application creation still works
    }
  }, [user, serviceId]);

  useEffect(() => {
    if (!authLoading) {
      void loadUserUploadState();
      void loadApplication();
    }
  }, [authLoading, loadUserUploadState, loadApplication]);

  // Create application (DRAFT) then submit it
  const handleSubmitApplication = async () => {
    if (!user) {
      setSubmitMessage({ type: 'error', text: 'Please sign in to submit an application.' });
      return;
    }
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      let app = application;

      // Step 1: create if not already exists
      if (!app) {
        const createRes = await apiClient.post<Application>('/applications', { serviceId });
        app = createRes.data;
        setApplication(app);
      }

      // Step 2: submit (DRAFT → SUBMITTED)
      if (app.status === 'DRAFT' || app.status === 'NEEDS_CORRECTION') {
        const updateRes = await apiClient.put<Application>(`/applications/${app._id}`, { status: 'SUBMITTED' });
        app = updateRes.data;
        setApplication(app);
      }

      setSubmitMessage({ type: 'success', text: `Application ${app.appId} submitted successfully!` });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit application. Please try again.';
      setSubmitMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // clear transient upload state when user logs out
  useEffect(() => {
    if (!user) setUploadStateByDocumentId({});
  }, [user]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const uploadByDocumentId = useMemo(
    () =>
      uploads.reduce<Record<string, UploadedDocument>>((acc, upload) => {
        acc[getRequiredDocumentId(upload)] = upload;
        return acc;
      }, {}),
    [uploads],
  );

  const completion = useMemo(() => {
    const total = documents.length;
    const uploaded = documents.filter((document) => uploadByDocumentId[document._id] || uploadStateByDocumentId[document._id]?.status).length;
    return {
      total,
      uploaded,
      percent: total ? Math.round((uploaded / total) * 100) : 0,
    };
  }, [documents, uploadByDocumentId, uploadStateByDocumentId]);

  const handleFileUpload = async (documentId: string, file: File | null) => {
    if (!file) return;

    if (!user) {
      const text = 'Please sign in before uploading documents.';
      setUploadStateByDocumentId((prev) => ({ ...prev, [documentId]: { ...prev[documentId], tone: 'error', message: text, progress: 0 } }));
      setToastMessage(text);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      const text = 'Only JPG, PNG, and PDF files are supported.';
      setUploadStateByDocumentId((prev) => ({ ...prev, [documentId]: { fileName: file.name, tone: 'error', message: text, progress: 0 } }));
      setToastMessage(text);
      return;
    }

    if (file.size >= MAX_UPLOAD_SIZE) {
      const text = 'File size must be less than 5MB.';
      setUploadStateByDocumentId((prev) => ({ ...prev, [documentId]: { fileName: file.name, tone: 'error', message: text, progress: 0 } }));
      setToastMessage(text);
      return;
    }

    const document = documents.find((item) => item._id === documentId);
    const formData = new FormData();
    formData.append('file', file);
    if (document?.name) formData.append('expectedDocumentType', document.name);

    setUploadingId(documentId);
    setUploadStateByDocumentId((prev) => ({
      ...prev,
      [documentId]: { fileName: file.name, progress: 18, message: 'Encrypting upload package...', tone: 'success' },
    }));

    try {
      const response = await apiClient.post(`/upload/${documentId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const percent = event.total ? Math.round((event.loaded / event.total) * 72) + 18 : 56;
          setUploadStateByDocumentId((prev) => ({
            ...prev,
            [documentId]: { ...prev[documentId], progress: Math.min(percent, 90), message: 'Running AI document verification...' },
          }));
        },
      });

      const payload = normalizeUploadResponse(response.data);
      
      const getMessageForStatus = (status: DetectionStatus, confidence?: number): string => {
        switch (status) {
          case 'MATCHED':
            return `✓ Verified! Document matches expected type (${confidence}% confidence)`;
          case 'DETECTED':
            return `✓ Document detected and saved (${confidence}% confidence)`;
          case 'MISMATCHED':
            return `Document detected but doesn't match expected type. Please review.`;
          case 'NEEDS_REVIEW':
            return `Document partially recognized. Manual review recommended (${confidence}% confidence).`;
          case 'UNKNOWN':
            return 'Document could not be identified. Please upload a clearer image.';
          default:
            return 'Upload complete.';
        }
      };

      setUploadStateByDocumentId((prev) => ({
        ...prev,
        [documentId]: {
          ...prev[documentId],
          progress: 100,
          status: payload.status,
          detectedType: payload.detectedType,
          confidence: payload.confidence,
          reasons: payload.reasons,
          tone: ['MATCHED', 'DETECTED'].includes(payload.status) ? 'success' : 'error',
          message: getMessageForStatus(payload.status, payload.confidence),
        },
      }));
      await loadUserUploadState();
    } catch (err: any) {
      const text = err?.response?.data?.message || 'Upload failed. Please try again.';
      setUploadStateByDocumentId((prev) => ({
        ...prev,
        [documentId]: { ...prev[documentId], progress: 0, tone: 'error', message: text },
      }));
      setToastMessage(text);
    } finally {
      setUploadingId(null);
      setDraggingId(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F7F8FB] text-slate-950">
      {toastMessage && (
        <div className="fixed right-5 top-5 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-2xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {toastMessage}
          <button type="button" onClick={() => setToastMessage('')} aria-label="Dismiss alert">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      )}
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pl-0 lg:pl-[280px]">
        <Topbar />
        <main className="mx-auto grid w-full max-w-[1440px] flex-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10 lg:py-10">
          <section className="min-w-0 space-y-6">
            <Link href="/services" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600">
              <ChevronLeft className="h-4 w-4" />
              Back to services
            </Link>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton height="h-10" width="w-2/3" />
                  <Skeleton height="h-5" width="w-full" />
                  <Skeleton height="h-5" width="w-1/2" />
                </div>
              ) : error ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">{error}</div>
              ) : (
                <>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Guided upload workflow
                  </div>
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950">{service?.name || 'Service details'}</h1>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                        <p className="text-sm text-slate-500">{service?.description || 'Upload each required document and review the verification status before submission.'}</p>
                        <div className="mt-1 flex items-center gap-4">
                          <div className="rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700 border border-slate-100">{service?.estimatedProcessingTime ?? '7-10 working days'}</div>
                          <div className="rounded-full bg-white px-3 py-1 text-sm font-extrabold text-slate-900 border border-slate-100">{service?.fee ? `₹${service.fee}` : 'Free'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-500">Completion</p>
                      <p className="mt-1 text-4xl font-black text-slate-950">{completion.percent}%</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-[2rem] border border-slate-200 bg-white p-6">
                    <Skeleton height="h-6" width="w-1/2" />
                    <Skeleton height="h-28" width="w-full" className="mt-5 rounded-3xl" />
                  </div>
                ))
              ) : documents.length === 0 ? (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
                  <FileText className="mx-auto h-10 w-10 text-slate-300" />
                  <h2 className="mt-4 text-xl font-black text-slate-950">No documents required</h2>
                  <p className="mt-2 text-sm text-slate-500">This service does not have a document checklist yet.</p>
                </div>
              ) : (
                documents.map((document, index) => {
                  const persistedUpload = uploadByDocumentId[document._id];
                  const state = uploadStateByDocumentId[document._id];
                  const isUploading = uploadingId === document._id;
                  const isDragging = draggingId === document._id;

                  return (
                    <UploadCard
                      key={document._id}
                      document={document}
                      persistedUpload={persistedUpload}
                      state={state}
                      isUploading={isUploading}
                      isDragging={isDragging}
                      onFileSelect={(file) => void handleFileUpload(document._id, file)}
                      onDragChange={(dragging) => setDraggingId(dragging ? document._id : null)}
                    />
                  );
                })
              )}
            </div>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            {/* Upload progress card */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Workflow</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Upload progress</h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${completion.percent}%` }} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-600">
                {completion.uploaded} of {completion.total} documents complete
              </p>

              <div className="mt-6 space-y-3">
                {[
                  { label: 'Choose service', done: true },
                  { label: 'Upload documents', done: completion.uploaded > 0 },
                  { label: 'AI verification', done: (summary?.detected ?? 0) > 0 || completion.percent === 100 },
                  { label: 'Ready for review', done: completion.percent === 100 },
                  { label: 'Application submitted', done: application?.status === 'SUBMITTED' || application?.status === 'UNDER_REVIEW' || application?.status === 'APPROVED' },
                ].map((step) => (
                  <div key={step.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-full', step.done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400')}>
                      {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{step.label}</span>
                  </div>
                ))}
              </div>

              {/* Submit / status block */}
              <div className="mt-6">
                {application?.status === 'SUBMITTED' || application?.status === 'UNDER_REVIEW' || application?.status === 'APPROVED' ? (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-center space-y-2">
                    <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600" />
                    <p className="text-sm font-bold text-emerald-800">Application Submitted</p>
                    <p className="text-xs text-emerald-600 font-mono font-semibold">{application.appId}</p>
                    <Link
                      href="/applications"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View in My Applications
                    </Link>
                  </div>
                ) : application?.status === 'REJECTED' ? (
                  <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-center space-y-1">
                    <p className="text-sm font-bold text-red-800">Application Rejected</p>
                    <p className="text-xs text-red-600">Please correct your documents and resubmit.</p>
                    <button
                      onClick={handleSubmitApplication}
                      disabled={isSubmitting}
                      className="mt-2 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Resubmit Application
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmitApplication}
                    disabled={isSubmitting || completion.uploaded === 0}
                    className="w-full py-3 rounded-2xl bg-[#1D61FF] hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:shadow-none"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Submit Application</>
                    )}
                  </button>
                )}

                {completion.uploaded === 0 && !application && (
                  <p className="mt-2 text-center text-xs text-slate-400 font-medium">Upload at least one document to submit</p>
                )}

                {submitMessage && (
                  <div className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-xs font-semibold ${
                    submitMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
                  }`}>
                    {submitMessage.type === 'success'
                      ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      : <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />}
                    {submitMessage.text}
                  </div>
                )}
              </div>
            </div>

            {/* Verification summary card */}
            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Verification summary</p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: 'Verified', value: summary?.detected ?? 0 },
                  { label: 'Review', value: summary?.mismatched ?? 0 },
                  { label: 'Unknown', value: summary?.unknown ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/10 p-3 text-center">
                    <p className="text-2xl font-black">{item.value}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-300">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                {(summary?.tips || ['Use clear scans with readable text.', 'Keep filenames close to the document type.', 'Replace any mismatch before final review.']).map((tip) => (
                  <p key={tip} className="flex gap-3">
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-blue-300" />
                    {tip}
                  </p>
                ))}
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
