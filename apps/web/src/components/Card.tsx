import React from 'react';
import { cn } from '../lib/utils';

interface CardProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className }) => (
  <div className={cn('rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]', className)}>
    {title && (
      <div className="border-b border-slate-100 px-6 py-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">{title}</h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);
