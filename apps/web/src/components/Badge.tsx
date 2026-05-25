import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className }) => {
  const base = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold';
  const variants: Record<string, string> = {
    DETECTED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    MISMATCH: 'bg-rose-100 text-rose-700 border border-rose-200',
    UNKNOWN: 'bg-slate-100 text-slate-700 border border-slate-200',
    PENDING: 'bg-slate-50 text-slate-600 border border-slate-200',
  };
  const labels: Record<string, string> = {
    DETECTED: 'Verified',
    MISMATCH: 'Review needed',
    UNKNOWN: 'Unknown',
    PENDING: 'Pending',
  };
  const style = variants[status] || variants['PENDING'];
  return (
    <span className={`${base} ${style} ${className}`}>{labels[status] || status}</span>
  );
};
