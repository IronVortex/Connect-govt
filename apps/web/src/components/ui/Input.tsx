'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  id: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, error, icon, rightElement, className, id, ...props }, ref) => {
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <label htmlFor={id} className="text-sm font-semibold text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
          <input
            id={id}
            ref={ref}
            className={cn(
              'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-[#1D61FF] focus:ring-4 focus:ring-[#1D61FF]/10',
              icon ? 'pl-12' : 'pl-4',
              rightElement ? 'pr-14' : 'pr-4',
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : '',
            )}
            aria-invalid={!!error}
            {...props}
          />
          {rightElement && <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightElement}</div>}
        </div>
        {description && <p className="text-xs text-slate-500">{description}</p>}
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
