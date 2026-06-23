'use client';

import { useEffect, useState } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { useAuth } from '../../lib/AuthContext';
import apiClient from '../../services/apiClient';
import { UploadedDocument, RequiredDocument, Service } from '@connect/types';
import { normalizeUploadDocument } from '../../lib/uploadHelpers';
import {
  Wallet,
  ShieldCheck,
  Download,
  FileText,
  FileImage,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  HelpCircle,
  CalendarClock,
  Eye,
  Layers,
} from 'lucide-react';

function getDocName(doc: UploadedDocument): string {
  const rd = doc.requiredDocument;
  return typeof rd === 'string' ? doc.filename : (rd as RequiredDocument).name;
}

function getServiceName(doc: UploadedDocument): string {
  const rd = doc.requiredDocument;
  if (typeof rd === 'string') return '—';
  const svc = (rd as RequiredDocument).service;
  if (!svc) return '—';
  return typeof svc === 'string' ? svc : (svc as Service).name;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function expiryDaysLeft(doc: UploadedDocument & { expiresAt?: string }): number | null {
  const expiryStr = (doc as any).expiresAt ?? null;
  if (expiryStr) {
    const days = Math.ceil((new Date(expiryStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  }
  if (!doc.createdAt) return null;
  const expiry = new Date(doc.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000;
  return Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24));
}

const STATUS_META: Record<
  string,
  { label: string; icon: React.ElementType; bg: string; text: string; dot: string }
> = {
  VERIFIED: {
    label: 'VERIFIED',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  REVIEW_REQUIRED: {
    label: 'REVIEW_REQUIRED',
    icon: AlertCircle,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  REJECTED: {
    label: 'REJECTED',
    icon: XCircle,
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  MATCHED: {
    label: 'VERIFIED',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  DETECTED: {
    label: 'VERIFIED',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  NEEDS_REVIEW: {
    label: 'REVIEW_REQUIRED',
    icon: AlertCircle,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  MISMATCHED: {
    label: 'REJECTED',
    icon: XCircle,
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  UNKNOWN: {
    label: 'UNKNOWN',
    icon: HelpCircle,
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
  PENDING: {
    label: 'PENDING',
    icon: Clock,
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    dot: 'bg-slate-300',
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META['PENDING'];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${meta.bg} ${meta.text}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

function FileIcon({ mimetype }: { mimetype: string }) {
  const isImage = mimetype?.startsWith('image/');
  const Ic = isImage ? FileImage : FileText;
  return (
    <div className="w-12 h-12 rounded-2xl bg-[#F0F5FF] flex items-center justify-center text-[#1D61FF] shrink-0">
      <Ic className="w-6 h-6" />
    </div>
  );
}

async function downloadFile(uploadId: string, filename: string) {
  try {
    const res = await apiClient.get(`/upload/files/${uploadId}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    alert('Download failed. Please try again.');
  }
}

function WalletDocCard({ doc }: { doc: UploadedDocument }) {
  const daysLeft = expiryDaysLeft(doc);
  const isExpiringSoon = daysLeft !== null && daysLeft <= 14;

  return (
    <div className="group bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm shadow-slate-200/40 hover:border-[#1D61FF]/30 hover:shadow-md transition-all duration-200 flex flex-col gap-4">
      {/* top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <FileIcon mimetype={doc.mimetype} />
          <div>
            <p className="text-[15px] font-bold text-[#0F172A] leading-snug">{getDocName(doc)}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{getServiceName(doc)}</p>
          </div>
        </div>
        <StatusBadge status={doc.detectionStatus} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">File</p>
          <p className="text-xs font-semibold text-slate-700 mt-1 truncate">{doc.filename}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Size</p>
          <p className="text-xs font-semibold text-slate-700 mt-1">{formatSize(doc.size)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Uploaded</p>
          <p className="text-xs font-semibold text-slate-700 mt-1">{formatDate(doc.createdAt)}</p>
        </div>
        <div className={`rounded-xl p-3 ${isExpiringSoon ? 'bg-amber-50' : 'bg-slate-50'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${isExpiringSoon ? 'text-amber-500' : 'text-slate-400'}`}>
            Expires In
          </p>
          <p className={`text-xs font-semibold mt-1 ${isExpiringSoon ? 'text-amber-700' : 'text-slate-700'}`}>
            {daysLeft !== null ? `${daysLeft} days` : '90 days'}
          </p>
        </div>
      </div>

      {doc.confidence !== undefined && doc.confidence > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Confidence</p>
            <p className="text-xs font-bold text-[#1D61FF]">{doc.confidence}%</p>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1D61FF] transition-all duration-700"
              style={{ width: `${doc.confidence}%` }}
            />
          </div>
        </div>
      )}

      {isExpiringSoon && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <CalendarClock className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs font-semibold text-amber-700">
            Expiring soon — re-upload to keep this document active.
          </p>
        </div>
      )}

      <button
        onClick={() => downloadFile(doc._id, doc.filename)}
        className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-[#1D61FF] hover:text-white hover:border-[#1D61FF] transition-all duration-200 active:scale-[0.98]"
      >
        <Download className="w-4 h-4" />
        Download
      </button>
    </div>
  );
}
function HistoryRow({ doc }: { doc: UploadedDocument }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-slate-50 last:border-0">
      <FileIcon mimetype={doc.mimetype} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#0F172A] truncate">{getDocName(doc)}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{doc.filename} · {formatSize(doc.size)}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-slate-400 hidden sm:block">{formatDate(doc.createdAt)}</span>
        <StatusBadge status={doc.detectionStatus} />
        <button
          onClick={() => downloadFile(doc._id, doc.filename)}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-[#1D61FF] transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();

  const [walletDocs, setWalletDocs] = useState<UploadedDocument[]>([]);
  const [allUploads, setAllUploads] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'wallet' | 'history'>('wallet');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [walletRes, allRes] = await Promise.all([
        apiClient.get<UploadedDocument[]>('/upload/wallet'),
        apiClient.get<UploadedDocument[]>('/upload/me'),
      ]);
      const rawWallet = (walletRes.data ?? []).map(normalizeUploadDocument);
      const rawHistory = (allRes.data ?? []).map(normalizeUploadDocument);

      // Deduplicate wallet docs by document name (keep the latest one)
      const uniqueWalletMap = new Map<string, UploadedDocument>();
      rawWallet.forEach((doc) => {
        uniqueWalletMap.set(getDocName(doc), doc);
      });
      setWalletDocs(Array.from(uniqueWalletMap.values()).reverse());
      
      setAllUploads(rawHistory.reverse());
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load your documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();
  }, [authLoading, user]);

  // summary stats
  const statItems = [
    {
      label: 'Verified docs',
      value: walletDocs.length,
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Total uploads',
      value: allUploads.length,
      icon: Layers,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Under review',
      value: allUploads.filter((d) => d.detectionStatus === 'REVIEW_REQUIRED').length,
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Expiring soon',
      value: walletDocs.filter((d) => {
        const days = expiryDaysLeft(d);
        return days !== null && days <= 14;
      }).length,
      icon: CalendarClock,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <PageLayout>

          {/* header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
                Document Wallet
              </h2>
              <p className="text-slate-500 text-[15px] font-medium mt-1">
                Your verified documents and complete upload history.
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {statItems.map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm shadow-slate-200/40 flex items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-[28px] font-extrabold text-[#0F172A] leading-none">{s.value}</p>
                  <p className="text-xs font-semibold text-slate-400 mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit mb-8">
            {(['wallet', 'history'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  tab === t
                    ? 'bg-white text-[#1D61FF] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'wallet' ? (
                  <span className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Verified Wallet
                    {walletDocs.length > 0 && (
                      <span className="bg-[#1D61FF] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {walletDocs.length}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Upload History
                    {allUploads.length > 0 && (
                      <span className="bg-slate-400 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {allUploads.length}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[24px] border border-slate-100 p-6 h-64 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="h-14 bg-slate-50 rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-10 text-center text-red-700 font-semibold">
              {error}
            </div>
          ) : tab === 'wallet' ? (
            walletDocs.length === 0 ? (
              <div className="rounded-[32px] border border-slate-100 bg-white p-16 flex flex-col items-center text-center shadow-sm">
                <div className="w-20 h-20 rounded-full bg-[#F0F5FF] flex items-center justify-center mb-6">
                  <Wallet className="w-10 h-10 text-[#1D61FF]" />
                </div>
                <h3 className="text-xl font-extrabold text-[#0F172A]">Wallet is empty</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-sm font-medium">
                  Documents verified with <strong>Matched</strong> status appear here. Upload documents
                  through a service workflow to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {walletDocs.map((doc) => (
                  <WalletDocCard key={doc._id} doc={doc} />
                ))}
              </div>
            )
          ) : (
            /* upload history tab */
            allUploads.length === 0 ? (
              <div className="rounded-[32px] border border-slate-100 bg-white p-16 flex flex-col items-center text-center shadow-sm">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                  <Clock className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-extrabold text-[#0F172A]">No uploads yet</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-sm font-medium">
                  Start a service workflow and upload your documents to see them here.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm shadow-slate-200/40 divide-y divide-slate-50 overflow-hidden">
                <div className="px-8 py-5 bg-slate-50/60 flex items-center justify-between">
                  <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">
                    {allUploads.length} upload{allUploads.length !== 1 ? 's' : ''} total
                  </p>
                  <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider hidden sm:block">
                    Status
                  </p>
                </div>
                <div className="px-8">
                  {allUploads.map((doc) => (
                    <HistoryRow key={doc._id} doc={doc} />
                  ))}
                </div>
              </div>
            )
          )}
    </PageLayout>
  );
}
