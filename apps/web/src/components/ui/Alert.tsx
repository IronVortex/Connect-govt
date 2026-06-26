'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AlertProps {
  title?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}

const iconMap: Record<NonNullable<AlertProps['variant']>, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4" />,
  warning: <ShieldCheck className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

const variantStyles: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'bg-slate-50 text-slate-800 border-slate-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  warning: 'bg-amber-50 text-amber-800 border-amber-100',
  error: 'bg-red-50 text-red-800 border-red-100',
};

export function Alert({ title, variant = 'info', children, className }: AlertProps) {
  return (
    <div className={cn('rounded-2xl border px-4 py-3 text-sm shadow-sm', variantStyles[variant], className)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-current">{iconMap[variant]}</div>
        <div className="flex-1">
          {title && <p className="font-semibold">{title}</p>}
          <div className="text-sm leading-6 text-current">{children}</div>
        </div>
      </div>
    </div>
  );
}
