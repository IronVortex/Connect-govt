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
  ExternalLink,
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Application, ApplicationSummary, RequiredDocument, Service, UploadedDocument } from '@connect/types';
import { UploadCard } from '../../../components/UploadCard';
import { PageLayout } from '../../../components/layout/PageLayout';
import { Skeleton } from '../../../components/Skeleton';
import { useAuth } from '../../../lib/AuthContext';
import { cn } from '../../../lib/utils';
import apiClient from '../../../services/apiClient';
import { normalizeUploadDocument, normalizeUploadDetectedType, normalizeUploadStatus, normalizeUploadConfidence } from '../../../lib/uploadHelpers';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

type VerificationStatus = 'VERIFIED' | 'REVIEW_REQUIRED' | 'REJECTED' | 'UNKNOWN' | 'PENDING';
type UploadState = {
  fileName?: string;
  progress: number;
  message?: string;
  tone?: 'success' | 'error';
  status?: VerificationStatus;
  detectedType?: string;
  confidence?: number;
  verificationStatus?: string;
  analysis?: {
    detectedType?: string;
    verificationStatus?: string;
    classificationConfidence?: number;
    confidence?: number;
  };
  reasons?: string[];
  extractedFields?: Record<string, unknown>;
};

function getRequiredDocumentId(upload: UploadedDocument) {
  return typeof upload.requiredDocument === 'string' ? upload.requiredDocument : upload.requiredDocument._id;
}

function normalizeUploadResponse(data: any): {
  status: VerificationStatus;
  detectedType: string;
  confidence?: number;
  reasons?: string[];
  extractedFields?: Record<string, unknown>;
} {
  return {
    status: normalizeUploadStatus(data),
    detectedType: normalizeUploadDetectedType(data),
    confidence: normalizeUploadConfidence(data),
    reasons: data?.reasons || data?.detectionReasons,
    extractedFields: data?.extractedFields,
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState('');

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
      setUploads((uploadsRes.data || []).map(normalizeUploadDocument));
      setSummary(summaryRes.data || null);
    } catch (err: any) {
      console.error(err);
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
      // Catch blocks cleanly handled
    }
  }, [user, serviceId]);

  useEffect(() => {
    if (!authLoading) {
      void loadUserUploadState();
      void loadApplication();
    }
  }, [authLoading, loadUserUploadState, loadApplication]);

  const handleSubmitApplication = async () => {
    if (!user) {
      setSubmitMessage({ type: 'error', text: 'Please sign in to submit an application.' });
      return;
    }
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      let app = application;
      if (!app) {
        const createRes = await apiClient.post<Application>('/applications', { serviceId });
        app = createRes.data;
        setApplication(app);
      }

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

  useEffect(() => {
    if (!user) setUploadStateByDocumentId({});
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
    const calculatedPercent = total ? Math.round((uploaded / total) * 100) : 0;
    return {
      total,
      uploaded,
      percent: isNaN(calculatedPercent) ? 0 : calculatedPercent,
    };
  }, [documents, uploadByDocumentId, uploadStateByDocumentId]);

  const handleFileUpload = async (documentId: string, file: File | null) => {
    if (!file) return;

    if (!user) {
      const text = 'Please sign in before uploading documents.';
      setUploadStateByDocumentId((prev) => ({ ...prev, [documentId]: { ...prev[documentId], tone: 'error', message: text, progress: 0 } }));
      setToast({ type: 'error', text });
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      const text = 'Only JPG, PNG, and PDF files are supported.';
      setUploadStateByDocumentId((prev) => ({ ...prev, [documentId]: { fileName: file.name, tone: 'error', message: text, progress: 0 } }));
      setToast({ type: 'error', text });
      return;
    }

    if (file.size >= MAX_UPLOAD_SIZE) {
      const text = 'File size must be less than 5MB.';
      setUploadStateByDocumentId((prev) => ({ ...prev, [documentId]: { fileName: file.name, tone: 'error', message: text, progress: 0 } }));
      setToast({ type: 'error', text });
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
      
      const getMessageForStatus = (status: VerificationStatus, confidence?: number): string => {
        switch (status) {
          case 'VERIFIED':
            return `Document verified successfully (${confidence}% confidence)`;
          case 'REVIEW_REQUIRED':
            return `Document requires manual review (${confidence}% confidence)`;
          case 'REJECTED':
            return `Wrong document uploaded or validation failed. Please upload the correct document.`;
          case 'PENDING':
            return `Document upload received and verification is pending (${confidence ?? '—'}% confidence).`;
          case 'UNKNOWN':
            return 'Document could not be classified reliably. Please upload a clearer image.';
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
          extractedFields: payload.extractedFields,
          tone: payload.status === 'VERIFIED' ? 'success' : 'error',
          message: getMessageForStatus(payload.status, payload.confidence),
        },
      }));
      setToast({ type: payload.status === 'VERIFIED' ? 'success' : 'error', text: getMessageForStatus(payload.status, payload.confidence) });
      await loadUserUploadState();
    } catch (err: any) {
      const text = err?.response?.data?.message || 'Upload failed. Please try again.';
      setUploadStateByDocumentId((prev) => ({
        ...prev,
        [documentId]: { ...prev[documentId], progress: 0, tone: 'error', message: text },
      }));
      setToast({ type: 'error', text });
    } finally {
      setUploadingId(null);
      setDraggingId(null);
    }
  };

  return (
    <PageLayout>
      {/* Toast Alert System Notification Banner */}
      {toast && (
        <div className={cn(
          "fixed right-6 top-6 z-50 flex max-w-md items-center gap-3.5 rounded-2xl border px-4.5 py-3.5 text-sm font-semibold shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4",
          toast.type === 'success'
            ? 'border-emerald-200/80 bg-emerald-50/95 text-emerald-900 shadow-emerald-100/40'
            : 'border-rose-200/80 bg-rose-50/95 text-rose-900 shadow-rose-100/40'
        )}>
          {toast.type === 'success' ? (
            <div className="rounded-lg bg-emerald-500 p-1 text-white shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
          ) : (
            <div className="rounded-lg bg-rose-500 p-1 text-white shrink-0"><AlertCircle className="h-4 w-4" /></div>
          )}
          <span className="flex-1 text-xs tracking-tight leading-relaxed">{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss alert" className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-200/50">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Structural Page Layout Block */}
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_380px] max-w-7xl mx-auto px-1">
          <section className="min-w-0 space-y-6">
            <Link href="/services" className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-blue-600">
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to services
            </Link>

            {/* Header Hero Section Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50/50 via-indigo-50/10 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />
              {loading ? (
                <div className="space-y-4">
  <Skeleton className="h-6 w-32 rounded-full" />
  <Skeleton className="h-10 w-2/3" />
  <Skeleton className="h-5 w-full" />
</div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-xs font-medium text-rose-700 backdrop-blur-xs flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : (
                <div className="relative z-10">
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700 shadow-2xs">
                    <Sparkles className="h-3 w-3 text-blue-600 animate-pulse" />
                    Guided workflow
                  </div>
                  <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2 flex-1">
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{service?.name || 'Service details'}</h1>
                      <p className="text-sm text-slate-500 leading-relaxed max-w-2xl font-medium">{service?.description || 'Upload each required document and review the verification status before submission.'}</p>
                      
                      <div className="pt-2 flex flex-wrap items-center gap-2.5">
                        <div className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200/60 shadow-2xs">{service?.estimatedProcessingTime ?? '7-10 working days'}</div>
                        <div className="rounded-xl bg-blue-50/30 px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-100/60 shadow-2xs">{service?.fee ? `₹${service.fee}` : 'Free processing'}</div>
                      </div>
                    </div>
                    
                    {/* Completion Circular Accent Module */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4.5 text-center min-w-[110px] self-start md:self-auto shadow-2xs backdrop-blur-xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completion</p>
                      <p className="mt-1.5 text-3xl font-black text-slate-900 tracking-tight">{completion.percent}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Document Checklist Workspace Segment */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Required Documents checklist</h3>
                {!loading && documents.length > 0 && (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {completion.uploaded}/{completion.total} Done
                  </span>
                )}
              </div>

              {loading ? (
                Array.from({ length: 2 }).map((_, index) => (
                  Array.from({ length: 2 }).map((_, index) => (
  <div key={index} className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4">
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-28 w-full rounded-2xl" />
  </div>
))
                ))
              ) : documents.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-2xs">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-slate-400 shadow-2xs">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">No documents required</h2>
                  <p className="mt-1 text-xs text-slate-400 font-medium max-w-xs mx-auto">This automated micro-service pipeline does not require an uploaded document checklist structure.</p>
                </div>
              ) : (
                <>
                  {uploadingId && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs font-medium text-blue-800 shadow-2xs backdrop-blur-xs animate-pulse flex items-center gap-2.5">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                      <span>
                        Upload pipeline lock active for{' '}
                        <strong className="font-bold text-slate-900">
                          {documents.find((doc) => doc._id === uploadingId)?.name || 'your document'}
                        </strong>
                        . Background analytics running...
                      </span>
                    </div>
                  )}
                  <div className="space-y-3.5">
                    {documents.map((document) => {
                      const persistedUpload = uploadByDocumentId[document._id];
                      const state = uploadStateByDocumentId[document._id];
                      const isActiveUpload = uploadingId === document._id;
                      const isDragging = draggingId === document._id;
                      const isDisabled = !!uploadingId && uploadingId !== document._id;

                      return (
                        <div key={document._id} className={cn(
                          "transition-all duration-200 rounded-3xl",
                          isDisabled ? "opacity-40 pointer-events-none bg-slate-50/50 border border-slate-200/50" : ""
                        )}>
                          <UploadCard
                            document={document}
                            persistedUpload={persistedUpload}
                            state={state}
                            isUploading={isActiveUpload}
                            isDragging={isDragging}
                            disabled={isDisabled}
                            onFileSelect={(file) => {
                              if (!isDisabled) void handleFileUpload(document._id, file);
                            }}
                            onDragChange={(dragging) => {
                              if (!isDisabled) setDraggingId(dragging ? document._id : null);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Sticky Sidebar Operations Control Panel Container */}
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-5.5 shadow-xs relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workflow Matrix</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900 tracking-tight">Pipeline state</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              
              {/* Sidebar Dynamic Metric Progress Bar Component */}
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 border border-slate-200/40">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out" style={{ width: `${completion.percent}%` }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {completion.uploaded} of {completion.total} sections compiled
              </p>

              {/* Enhanced Visual Workflow Progression Steps Segment */}
              <div className="mt-5 space-y-2">
                {[
                  { label: 'Choose target service', done: true },
                  { label: 'Upload checklist items', done: completion.uploaded > 0 },
                  { label: 'AI classification pass', done: (summary?.verified ?? summary?.detected ?? 0) > 0 || completion.percent >= 100 },
                  { label: 'Evaluation readiness', done: completion.percent >= 100 },
                  { label: 'Pipeline validation submission', done: application?.status === 'SUBMITTED' || application?.status === 'UNDER_REVIEW' || application?.status === 'APPROVED' },
                ].map((step, idx) => (
                  <div key={step.label} className={cn(
                    "flex items-center gap-3 rounded-xl border p-2.5 transition duration-150 text-xs font-semibold",
                    step.done 
                      ? 'bg-slate-50/80 border-slate-200 text-slate-700' 
                      : 'bg-white border-slate-100 text-slate-400 opacity-75'
                  )}>
                    <div className={cn(
                      'flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-[10px]', 
                      step.done ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-200/60'
                    )}>
                      {step.done ? <CheckCircle2 className="h-3 w-3" /> : <span>{idx + 1}</span>}
                    </div>
                    <span className="truncate tracking-tight">{step.label}</span>
                  </div>
                ))}
              </div>

              {/* Dynamic Contextual Action Trigger Interface Module Block */}
              <div className="mt-5">
                {application?.status === 'SUBMITTED' || application?.status === 'UNDER_REVIEW' || application?.status === 'APPROVED' ? (
                  <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100/80 p-4 text-center space-y-2.5 backdrop-blur-xs">
                    <div className="mx-auto w-8 h-8 bg-emerald-500 rounded-xl text-white flex items-center justify-center shadow-xs shadow-emerald-100"><CheckCircle2 className="h-4 w-4" /></div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-emerald-900">Application Submitted</p>
                      <p className="text-[10px] text-emerald-600 font-mono tracking-tight">{application.appId}</p>
                    </div>
                    <Link
                      href="/applications"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-2xs w-full justify-center"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View status updates
                    </Link>
                  </div>
                ) : application?.status === 'REJECTED' ? (
                  <div className="rounded-2xl bg-rose-50/60 border border-rose-100/80 p-4 text-center space-y-2 backdrop-blur-xs">
                    <p className="text-xs font-bold text-rose-900">Application Blocked / Rejected</p>
                    <p className="text-[11px] text-rose-500 font-medium">Please review failure reasons and replace corrupted scans.</p>
                    <button
                      onClick={handleSubmitApplication}
                      disabled={isSubmitting}
                      className="mt-2 w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm shadow-rose-200 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Force Resubmit Application
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmitApplication}
                    disabled={isSubmitting || completion.uploaded < completion.total}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 border border-transparent text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/10 active:scale-[0.98] disabled:shadow-none"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting files...</>
                    ) : (
                      <><Send className="h-3.5 w-3.5" /> Submit Application</>
                    )}
                  </button>
                )}

                {completion.uploaded < completion.total && (
                  <p className="mt-2.5 text-center text-[10px] text-slate-400 font-semibold tracking-tight">Upload all pending parameters to unlock submission block</p>
                )}

                {submitMessage && (
                  <div className={cn(
                    "mt-3 flex items-start gap-2 rounded-xl p-3 text-xs font-semibold border backdrop-blur-xs",
                    submitMessage.type === 'success' ? 'bg-emerald-50/70 text-emerald-900 border-emerald-100' : 'bg-rose-50/70 text-rose-900 border-rose-100'
                  )}>
                    {submitMessage.type === 'success'
                      ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                      : <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 mt-0.5" />}
                    <span className="text-[11px] leading-relaxed tracking-tight">{submitMessage.text}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Analytics Breakdown Metadata Board */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5.5 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">AI Audit Metrics</p>
              
              <div className="mt-4.5 grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Verified', value: summary?.verified ?? summary?.detected ?? 0, bg: 'bg-white/5 border-white/5 hover:bg-white/10 text-emerald-400' },
                  { label: 'Review', value: summary?.reviewRequired ?? summary?.mismatched ?? 0, bg: 'bg-white/5 border-white/5 hover:bg-white/10 text-amber-400' },
                  { label: 'Unknown', value: summary?.unknown ?? 0, bg: 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400' },
                ].map((item) => (
                  <div key={item.label} className={cn("rounded-xl border p-3 text-center transition", item.bg)}>
                    <p className="text-2xl font-bold tracking-tight text-white">{item.value}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-5 space-y-2.5 text-[11px] leading-relaxed text-slate-400 border-t border-slate-800/80 pt-4">
                {(summary?.tips || ['Use clear flat scans with readable string tokens.', 'Keep metadata structures aligned to framework requirements.', 'Replace flag mismatches prior to final execution audits.']).map((tip) => (
                  <div key={tip} className="flex gap-2.5 items-start group">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500 transition-transform group-hover:translate-x-0.5" />
                    <span className="font-medium tracking-tight">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
      </div>
    </PageLayout>
  );
}