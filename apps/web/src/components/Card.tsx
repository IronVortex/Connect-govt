import React from 'react';
import { cn } from '../lib/utils';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, className, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200',
        className
      )}
      {...props}
    >
      {title && (
        <div className="border-b border-slate-100 px-6 py-4 sm:px-8">
          <div className="text-base font-semibold text-slate-900 tracking-tight">
            {title}
          </div>
        </div>
      )}
      <div className="p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
};