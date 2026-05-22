import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className }) => {
  const base = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold';
  const variants: Record<string, string> = {
    DETECTED: 'bg-green-100 text-green-700 border border-green-200',
    MISMATCH: 'bg-red-100 text-red-700 border border-red-200',
    UNKNOWN: 'bg-slate-100 text-slate-700 border border-slate-200',
    PENDING: 'bg-slate-50 text-slate-600 border border-slate-200',
  };
  const style = variants[status] || variants['PENDING'];
  return (
    <span className={`${base} ${style} ${className}`}> {status} </span>
  );
};
