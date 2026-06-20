'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { useAuth } from '../../lib/AuthContext';
import apiClient from '../../services/apiClient';
import { Application, UploadedDocument } from '@connect/types';
import { normalizeUploadDocument } from '../../lib/uploadHelpers';
import {
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  RefreshCw,
  Send,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  category: 'upload' | 'application' | 'system';
  read: boolean;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function uploadToNotification(upload: UploadedDocument): NotificationItem {
  const docName =
    typeof upload.requiredDocument === 'string'
      ? upload.filename
      : (upload.requiredDocument as any)?.name ?? upload.filename;

  const statusMessages: Record<string, string> = {
    VERIFIED: `"${docName}" was verified successfully.`,
    REVIEW_REQUIRED: `"${docName}" needs manual review — confidence was moderate.`,
    REJECTED: `"${docName}" was rejected — wrong document or validation failed.`,
    UNKNOWN: `"${docName}" could not be classified. Try uploading a clearer file.`,
    MATCHED: `"${docName}" was verified successfully.`,
    DETECTED: `"${docName}" was verified successfully.`,
    MISMATCHED: `"${docName}" was rejected — wrong document type.`,
    NEEDS_REVIEW: `"${docName}" needs manual review.`,
  };

  const titles: Record<string, string> = {
    VERIFIED: 'Document verified',
    REVIEW_REQUIRED: 'Review required',
    REJECTED: 'Document rejected',
    UNKNOWN: 'Unrecognised document',
    MATCHED: 'Document verified',
    DETECTED: 'Document verified',
    MISMATCHED: 'Document rejected',
    NEEDS_REVIEW: 'Review required',
  };

  return {
    id: `upload-${upload._id}`,
    title: titles[upload.detectionStatus] ?? 'Upload processed',
    description: statusMessages[upload.detectionStatus] ?? `"${docName}" was processed.`,
    time: timeAgo(upload.updatedAt ?? upload.createdAt),
    category: 'upload',
    read: false,
  };
}

function applicationToNotification(app: Application): NotificationItem {
  const svcName =
    typeof app.service === 'string' ? app.service : (app.service as any)?.name ?? 'your application';

  const statusMessages: Record<string, string> = {
    DRAFT: `Application for "${svcName}" saved as a draft.`,
    SUBMITTED: `Application for "${svcName}" submitted successfully.`,
    UNDER_REVIEW: `Application for "${svcName}" is now under review by the department.`,
    APPROVED: `🎉 Application for "${svcName}" has been approved!`,
    REJECTED: `Application for "${svcName}" was rejected. Please correct your documents.`,
    NEEDS_CORRECTION: `Application for "${svcName}" needs corrections before resubmission.`,
  };

  const titles: Record<string, string> = {
    DRAFT: 'Application drafted',
    SUBMITTED: 'Application submitted',
    UNDER_REVIEW: 'Application under review',
    APPROVED: 'Application approved',
    REJECTED: 'Application rejected',
    NEEDS_CORRECTION: 'Correction required',
  };

  return {
    id: `app-${app._id}`,
    title: titles[app.status] ?? 'Application updated',
    description: statusMessages[app.status] ?? `Status: ${app.status}`,
    time: timeAgo(app.updatedAt ?? app.createdAt),
    category: 'application',
    read: false,
  };
}

// ─── icon & style per category ────────────────────────────────────────────────

function categoryIcon(n: NotificationItem) {
  if (n.category === 'upload') {
    if (n.title.includes('verified') || n.title.includes('detected'))
      return { Icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600' };
    if (n.title.includes('mismatch') || n.title.includes('Unrecognised'))
      return { Icon: XCircle, bg: 'bg-red-50', color: 'text-red-500' };
    return { Icon: ShieldAlert, bg: 'bg-amber-50', color: 'text-amber-500' };
  }
  if (n.category === 'application') {
    if (n.title.includes('approved'))
      return { Icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600' };
    if (n.title.includes('rejected'))
      return { Icon: XCircle, bg: 'bg-red-50', color: 'text-red-500' };
    if (n.title.includes('Correction'))
      return { Icon: ShieldAlert, bg: 'bg-orange-50', color: 'text-orange-500' };
    if (n.title.includes('submitted'))
      return { Icon: Send, bg: 'bg-blue-50', color: 'text-blue-600' };
    return { Icon: FileText, bg: 'bg-slate-100', color: 'text-slate-500' };
  }
  return { Icon: Info, bg: 'bg-[#EEF2FF]', color: 'text-[#1D4ED8]' };
}

// ─── filter tabs ──────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Uploads', 'Applications'] as const;
type Filter = (typeof FILTERS)[number];

// ─── main page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [uploadsRes, appsRes] = await Promise.all([
        apiClient.get<UploadedDocument[]>('/upload/me'),
        apiClient.get<Application[]>('/applications').catch(() => ({ data: [] as Application[] })),
      ]);

      const uploadNotifs: NotificationItem[] = (uploadsRes.data ?? [])
        .map(normalizeUploadDocument)
        .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
        .map(uploadToNotification);

      const appNotifs: NotificationItem[] = (appsRes.data ?? [])
        .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
        .map(applicationToNotification);

      // interleave by recency — just concat and sort by time string presence
      setNotifications([...uploadNotifs, ...appNotifs]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();
  }, [authLoading, user]);

  const markAllRead = () => setReadIds(new Set(notifications.map((n) => n.id)));
  const markRead = (id: string) => setReadIds((prev) => new Set([...prev, id]));
  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setReadIds((prev) => { prev.delete(id); return new Set(prev); });
  };

  const filtered = useMemo(() => {
    if (filter === 'Uploads') return notifications.filter((n) => n.category === 'upload');
    if (filter === 'Applications') return notifications.filter((n) => n.category === 'application');
    return notifications;
  }, [filter, notifications]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">

          {/* header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="bg-[#1D61FF] text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-[15px] font-medium mt-1">
                Updates from your document uploads and application status changes.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-sm font-bold text-[#1D61FF] hover:underline"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* filter tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit mb-8">
            {FILTERS.map((f) => {
              const count =
                f === 'All' ? notifications.length
                : f === 'Uploads' ? notifications.filter((n) => n.category === 'upload').length
                : notifications.filter((n) => n.category === 'application').length;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                    filter === f ? 'bg-white text-[#1D61FF] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f}
                  {count > 0 && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      filter === f ? 'bg-[#1D61FF] text-white' : 'bg-slate-300 text-white'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* content */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-[24px] border border-slate-100 bg-white p-6 flex items-start gap-5 animate-pulse">
                  <div className="w-12 h-12 rounded-3xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded-lg w-1/3" />
                    <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-10 text-center text-red-700 font-semibold">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[32px] border border-slate-100 bg-white p-16 flex flex-col items-center text-center shadow-sm">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                <Bell className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-extrabold text-[#0F172A]">No notifications yet</h3>
              <p className="text-slate-500 text-sm mt-2 max-w-sm font-medium">
                Upload documents or submit an application to start seeing activity here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((n) => {
                const { Icon, bg, color } = categoryIcon(n);
                const isRead = readIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`rounded-[24px] border bg-white p-6 shadow-sm shadow-slate-200/40 flex items-start gap-5 cursor-pointer transition-all duration-200 hover:shadow-md group ${
                      isRead ? 'border-slate-100 opacity-70' : 'border-slate-200 hover:border-[#1D61FF]/20'
                    }`}
                  >
                    {/* unread dot */}
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 rounded-3xl ${bg} flex items-center justify-center ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {!isRead && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#1D61FF] rounded-full border-2 border-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className={`text-[15px] font-bold ${isRead ? 'text-slate-500' : 'text-[#0F172A]'}`}>
                          {n.title}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-400 font-medium">{n.time}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                            title="Dismiss"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{n.description}</p>
                      <span className={`mt-2 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        n.category === 'upload' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {n.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
