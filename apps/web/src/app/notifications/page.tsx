'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { useAuth } from '../../lib/AuthContext';
import apiClient from '../../services/apiClient';
import { Application, UploadedDocument } from '@connect/types';
import { normalizeUploadDocument } from '../../lib/uploadHelpers';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { cn } from '../../lib/utils';
import {
  Bell,
  CheckCircle2,
  FileText,
  Info,
  RefreshCw,
  Send,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  category: 'upload' | 'application' | 'system';
  read: boolean;
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
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
    APPROVED: `Application for "${svcName}" has been approved!`,
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

// Normalized styles directly mapping color variables uniformly
function categoryIcon(n: NotificationItem) {
  if (n.category === 'upload') {
    if (n.title.includes('verified') || n.title.includes('detected'))
      return { Icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-100', color: 'text-emerald-600' };
    if (n.title.includes('mismatch') || n.title.includes('Unrecognised'))
      return { Icon: XCircle, bg: 'bg-red-50 border-red-100', color: 'text-red-600' };
    return { Icon: ShieldAlert, bg: 'bg-amber-50 border-amber-100', color: 'text-amber-600' };
  }
  if (n.category === 'application') {
    if (n.title.includes('approved'))
      return { Icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-100', color: 'text-emerald-600' };
    if (n.title.includes('rejected'))
      return { Icon: XCircle, bg: 'bg-red-50 border-red-100', color: 'text-red-600' };
    if (n.title.includes('Correction'))
      return { Icon: ShieldAlert, bg: 'bg-orange-50 border-orange-100', color: 'text-orange-600' };
    if (n.title.includes('submitted'))
      return { Icon: Send, bg: 'bg-blue-50 border-blue-100', color: 'text-blue-600' };
    return { Icon: FileText, bg: 'bg-slate-50 border-slate-200/60', color: 'text-slate-600' };
  }
  return { Icon: Info, bg: 'bg-blue-50 border-blue-100', color: 'text-blue-700' };
}

const FILTERS = ['All', 'Uploads', 'Applications'] as const;
type Filter = (typeof FILTERS)[number];

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
      setNotifications([...uploadNotifs, ...appNotifs]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load system notifications.');
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
    <PageLayout>
      {/* Title Segment Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                {unreadCount} pending
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs font-medium">
            Track validation logs, pipeline reviews, and verification metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Mark all as read
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Segment Filter Selection Pills */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {FILTERS.map((f) => {
          const count =
            f === 'All' ? notifications.length
            : f === 'Uploads' ? notifications.filter((n) => n.category === 'upload').length
            : notifications.filter((n) => n.category === 'application').length;
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-2 ${
                isActive ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{f}</span>
              {count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Stream Rendering Layout */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200/60 bg-white p-4 flex items-start gap-4 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 bg-slate-100 rounded w-1/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Alert variant="error" title="Pipeline Failure Log">{error}</Alert>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-200 bg-white">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 mx-auto border border-slate-100">
            <Bell className="w-5 h-5 text-slate-300" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Activity buffer clear</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto font-medium">
            No pending action items or background processing updates match this filter choice.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((n) => {
            const { Icon, bg, color } = categoryIcon(n);
            const isRead = readIds.has(n.id);
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`rounded-xl border bg-white p-4 flex items-start gap-4 cursor-pointer transition-all duration-150 group relative ${
                  isRead ? 'border-slate-200/60 opacity-65 hover:opacity-85' : 'border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                {/* Visual Context Anchors */}
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-9 h-9 rounded-lg border flex items-center justify-center",
                    bg,
                    color
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isRead && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Content Payload Elements */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className={`text-xs font-semibold tracking-tight ${isRead ? 'text-slate-500' : 'text-slate-900'}`}>
                      {n.title}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400 font-medium">{n.time}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-150"
                        title="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-normal font-medium">{n.description}</p>
                  
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      n.category === 'upload' 
                        ? 'bg-blue-50/60 text-blue-600 border-blue-100' 
                        : 'bg-slate-50 text-slate-500 border-slate-200/60'
                    }`}>
                      {n.category}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}