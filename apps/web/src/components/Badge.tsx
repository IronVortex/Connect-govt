import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className }) => {
  const base = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold';
  const variants: Record<string, string> = {
    VERIFIED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    REVIEW_REQUIRED: 'bg-amber-100 text-amber-700 border border-amber-200',
    REJECTED: 'bg-red-100 text-red-700 border border-red-200',
    UNKNOWN: 'bg-slate-100 text-slate-700 border border-slate-200',
    PENDING: 'bg-slate-50 text-slate-600 border border-slate-200',
    // Legacy status mapping
    MATCHED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    DETECTED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    MISMATCHED: 'bg-red-100 text-red-700 border border-red-200',
    NEEDS_REVIEW: 'bg-amber-100 text-amber-700 border border-amber-200',
  };
  const labels: Record<string, string> = {
    VERIFIED: 'VERIFIED',
    REVIEW_REQUIRED: 'REVIEW_REQUIRED',
    REJECTED: 'REJECTED',
    UNKNOWN: 'UNKNOWN',
    PENDING: 'PENDING',
    MATCHED: 'VERIFIED',
    DETECTED: 'VERIFIED',
    MISMATCHED: 'REJECTED',
    NEEDS_REVIEW: 'REVIEW_REQUIRED',
  };
  const style = variants[status] || variants['PENDING'];
  return (
    <span className={`${base} ${style} ${className}`}>{labels[status] || status}</span>
  );
};
