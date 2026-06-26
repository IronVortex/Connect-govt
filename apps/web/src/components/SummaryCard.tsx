'use client';

import React from 'react';
import { cn } from '../lib/utils';

interface SummaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  variant?: 'default' | 'accent';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  variant = 'default',
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border p-6 transition-all duration-200',
        variant === 'accent'
          ? 'border-blue-100 bg-gradient-to-b from-blue-50/30 to-transparent shadow-sm'
          : 'border-slate-200 bg-white shadow-sm',
        className
      )}
      {...props}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {title}
      </p>
      
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <div className="text-2xl font-semibold text-slate-900 tracking-tight">
          {value}
        </div>
      </div>
      
      {subtitle && (
        <p className="mt-2 text-xs text-slate-400 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};