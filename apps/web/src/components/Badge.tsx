import React from 'react';
import { cn } from '../lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Clock, HelpCircle } from 'lucide-react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className, ...props }) => {
  const base = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors tracking-wide select-none';

  const variants: Record<string, { styles: string; icon: React.ReactNode; label: string }> = {
    VERIFIED: {
      styles: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      icon: <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />,
      label: 'Verified',
    },
    REVIEW_REQUIRED: {
      styles: 'bg-amber-50 text-amber-700 border border-amber-200/60',
      icon: <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]" />,
      label: 'Review Required',
    },
    REJECTED: {
      styles: 'bg-red-50 text-red-700 border border-red-200/60',
      icon: <XCircle className="h-3.5 w-3.5 stroke-[2.5]" />,
      label: 'Rejected',
    },
    PENDING: {
      styles: 'bg-slate-50 text-slate-600 border border-slate-200',
      icon: <Clock className="h-3.5 w-3.5 stroke-[2.5]" />,
      label: 'Pending',
    },
    UNKNOWN: {
      styles: 'bg-slate-50 text-slate-600 border border-slate-200',
      icon: <HelpCircle className="h-3.5 w-3.5 stroke-[2.5]" />,
      label: 'Unknown',
    },
    // Legacy mapping keys preserve original backend logic exactly
    MATCHED: {
      styles: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      icon: <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />,
      label: 'Verified',
    },
    DETECTED: {
      styles: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      icon: <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />,
      label: 'Verified',
    },
    MISMATCHED: {
      styles: 'bg-red-50 text-red-700 border border-red-200/60',
      icon: <XCircle className="h-3.5 w-3.5 stroke-[2.5]" />,
      label: 'Rejected',
    },
    NEEDS_REVIEW: {
      styles: 'bg-amber-50 text-amber-700 border border-amber-200/60',
      icon: <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]" />,
      label: 'Review Required',
    },
  };

  const current = variants[status] || variants['PENDING'];

  return (
    <span
      className={cn(base, current.styles, className)}
      {...props}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};