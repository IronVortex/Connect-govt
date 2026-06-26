'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}

const iconMap: Record<NonNullable<AlertProps['variant']>, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-600" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  error: <AlertCircle className="h-4 w-4 text-red-600" />,
};

const variantStyles: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'bg-blue-50/50 text-blue-900 border-blue-100/70',
  success: 'bg-emerald-50/50 text-emerald-900 border-emerald-100/70',
  warning: 'bg-amber-50/50 text-amber-900 border-amber-100/70',
  error: 'bg-red-50/50 text-red-900 border-red-100/70',
};

export function Alert({ title, variant = 'info', children, className, ...props }: AlertProps) {
  return (
    <div 
      className={cn('rounded-lg border p-3.5 text-sm shadow-2xs transition-all duration-200', variantStyles[variant], className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{iconMap[variant]}</div>
        <div className="flex-1 space-y-1">
          {title && <p className="font-semibold tracking-tight text-slate-900 text-xs uppercase tracking-wider">{title}</p>}
          <div className="text-xs font-medium leading-relaxed text-slate-600">{children}</div>
        </div>
      </div>
    </div>
  );
}