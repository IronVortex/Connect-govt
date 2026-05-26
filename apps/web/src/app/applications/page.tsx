'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import apiClient from '../../services/apiClient';
import { Application, ApplicationStatus, Service } from '@connect/types';
import { useAuth } from '../../lib/AuthContext';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Hash,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function getServiceName(app: Application): string {
  if (!app.service) return '—';
  return typeof app.service === 'string' ? app.service : (app.service as Service).name;
}

function getServiceId(app: Application): string | null {
  if (!app.service) return null;
  return typeof app.service === 'string' ? app.service : (app.service as Service)._id;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; icon: React.ElementType; pill: string; description: string }
> = {
  DRAFT: {
    label: 'Draft',
    icon: FileText,
    pill: 'bg-slate-100 text-slate-600',
    description: 'Not yet submitted. Upload documents and submit when ready.',
  },
  SUBMITTED: {
    label: 'Submitted',
    icon: Send,
    pill: 'bg-blue-50 text-blue-700',
    description: 'Your application is submitted and pending review.',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    icon: Clock,
    pill: 'bg-amber-50 text-amber-700',
    description: 'Being reviewed by the department.',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle2,
    pill: 'bg-emerald-50 text-emerald-700',
    description: 'Your application has been approved!',
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    pill: 'bg-red-50 text-red-700',
    description: 'Application rejected. Please correct documents and resubmit.',
  },
  NEEDS_CORRECTION: {
    label: 'Needs Correction',
    icon: ShieldAlert,
    pill: 'bg-orange-50 text-orange-700',
    description: 'Additional corrections required before resubmission.',
  },
};

// ─── status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.pill}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

// ─── timeline stepper ────────────────────────────────────────────────────────

const TIMELINE: ApplicationStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'];

function Timeline({ status }: { status: ApplicationStatus }) {
  const activeIdx = TIMELINE.indexOf(status);
  // rejected & needs_correction treated as stalled after SUBMITTED
  const effectiveIdx = status === 'REJECTED' || status === 'NEEDS_CORRECTION' ? 1 : activeIdx;

  return (
    <div className="flex items-center gap-0 mt-4">
      {TIMELINE.map((step, i) => {
        const done = i <= effectiveIdx;
        const isLast = i === TIMELINE.length - 1;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  done ? 'bg-[#1D61FF] text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? '✓' : i + 1}
              </div>
              <p className={`text-[9px] font-bold mt-1 whitespace-nowrap ${done ? 'text-[#1D61FF]' : 'text-slate-400'}`}>
                {STATUS_CONFIG[step].label}
              </p>
            </div>
            {!isLast && (
              <div className={`flex-1 h-[2px] mx-1 mb-4 rounded-full ${i < effectiveIdx ? 'bg-[#1D61FF]' : 'bg-slate-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── application card ─────────────────────────────────────────────────────────

function AppCard({
  app,
  onDelete,
  onSubmit,
  isActing,
}: {
  app: Application;
  onDelete: (id: string) => void;
  onSubmit: (id: string) => void;
  isActing: boolean;
}) {
  const cfg = STATUS_CONFIG[app.status];
  const serviceId = getServiceId(app);
  const canSubmit = app.status === 'DRAFT' || app.status === 'NEEDS_CORRECTION';
  const canDelete = app.status === 'DRAFT';

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm shadow-slate-200/40 hover:border-[#1D61FF]/20 hover:shadow-md transition-all duration-200 flex flex-col gap-4">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F0F5FF] flex items-center justify-center text-[#1D61FF] shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#0F172A] leading-snug">{getServiceName(app)}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{app.appId}</p>
          </div>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {/* status description */}
      <p className="text-xs text-slate-500 font-medium leading-relaxed">{cfg.description}</p>

      {/* timeline */}
      <Timeline status={app.status} />

      {/* meta */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Created</p>
          <p className="text-xs font-semibold text-slate-700 mt-1">{formatDate(app.createdAt)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Updated</p>
          <p className="text-xs font-semibold text-slate-700 mt-1">{formatDate(app.updatedAt)}</p>
        </div>
      </div>

      {/* actions */}
      <div className="flex gap-2 mt-auto pt-1">
        {serviceId && (
          <Link
            href={`/service-detail/${serviceId}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open workflow
          </Link>
        )}

        {canSubmit && (
          <button
            onClick={() => onSubmit(app._id)}
            disabled={isActing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#1D61FF] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-60"
          >
            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {app.status === 'NEEDS_CORRECTION' ? 'Resubmit' : 'Submit'}
          </button>
        )}

        {canDelete && (
          <button
            onClick={() => onDelete(app._id)}
            disabled={isActing}
            className="p-2.5 border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all disabled:opacity-60"
            title="Delete draft"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<Application[]>('/applications');
      setApplications(res.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load your applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    fetchApplications();
  }, [authLoading, user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSubmit = async (appId: string) => {
    setActingId(appId);
    try {
      await apiClient.put(`/applications/${appId}`, { status: 'SUBMITTED' });
      setToast({ type: 'success', text: 'Application submitted successfully!' });
      await fetchApplications();
    } catch (err: any) {
      setToast({ type: 'error', text: err?.response?.data?.message || 'Submit failed.' });
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (appId: string) => {
    if (!confirm('Delete this draft application? This cannot be undone.')) return;
    setActingId(appId);
    try {
      await apiClient.delete(`/applications/${appId}`);
      setToast({ type: 'success', text: 'Draft deleted.' });
      await fetchApplications();
    } catch (err: any) {
      setToast({ type: 'error', text: err?.response?.data?.message || 'Delete failed.' });
    } finally {
      setActingId(null);
    }
  };

  // group by status
  const active = applications.filter((a) => !['APPROVED', 'REJECTED'].includes(a.status));
  const completed = applications.filter((a) => ['APPROVED', 'REJECTED'].includes(a.status));

  const statItems = [
    { label: 'Total', value: applications.length, color: 'text-[#1D61FF]', bg: 'bg-[#F0F5FF]' },
    { label: 'Active', value: active.length, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved', value: applications.filter((a) => a.status === 'APPROVED').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Rejected', value: applications.filter((a) => a.status === 'REJECTED').length, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold border ${
          toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800' : 'bg-white border-red-100 text-red-700'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
          {toast.text}
        </div>
      )}

      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">

          {/* header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
                My Applications
              </h2>
              <p className="text-slate-500 text-[15px] font-medium mt-1">
                Track and manage your government service applications.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchApplications}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                href="/services"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1D61FF] text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 active:scale-95"
              >
                New Application
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {statItems.map((s) => (
              <div key={s.label} className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <Hash className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-[28px] font-extrabold leading-none ${s.color}`}>{s.value}</p>
                  <p className="text-xs font-semibold text-slate-400 mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[24px] border border-slate-100 p-6 h-72 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-3 mt-6">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-8 bg-slate-50 rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-10 text-center text-red-700 font-semibold">
              {error}
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-[32px] border border-slate-100 bg-white p-16 flex flex-col items-center text-center shadow-sm">
              <div className="w-20 h-20 rounded-full bg-[#F0F5FF] flex items-center justify-center mb-6">
                <Briefcase className="w-10 h-10 text-[#1D61FF]" />
              </div>
              <h3 className="text-xl font-extrabold text-[#0F172A]">No applications yet</h3>
              <p className="text-slate-500 text-sm mt-2 max-w-sm font-medium">
                Browse a service, upload your documents, and click{' '}
                <strong>Submit Application</strong> to start.
              </p>
              <Link
                href="/services"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#1D61FF] text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                Browse Services
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Active */}
              {active.length > 0 && (
                <section>
                  <h3 className="text-lg font-extrabold text-[#0F172A] mb-5">
                    Active Applications
                    <span className="ml-2 bg-[#1D61FF] text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{active.length}</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {active.map((app) => (
                      <AppCard
                        key={app._id}
                        app={app}
                        onDelete={handleDelete}
                        onSubmit={handleSubmit}
                        isActing={actingId === app._id}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <section>
                  <h3 className="text-lg font-extrabold text-[#0F172A] mb-5">
                    Completed
                    <span className="ml-2 bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">{completed.length}</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {completed.map((app) => (
                      <AppCard
                        key={app._id}
                        app={app}
                        onDelete={handleDelete}
                        onSubmit={handleSubmit}
                        isActing={actingId === app._id}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
