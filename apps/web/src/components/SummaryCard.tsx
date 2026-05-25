'use client';

import React from 'react';
import { cn } from '../lib/utils';

interface SummaryCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  variant?: 'default' | 'accent';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtitle, variant = 'default' }) => {
  return (
    <div className={cn('rounded-[20px] border p-6 bg-white shadow-sm', variant === 'accent' ? 'border-slate-100' : 'border-slate-100')}>
      <p className="text-xs font-semibold text-slate-400">{title}</p>
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <div className="text-2xl font-extrabold text-[#0F172A]">{value}</div>
      </div>
      {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
};
