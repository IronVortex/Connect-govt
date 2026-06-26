'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
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
      <div className={cn('space-y-1.5', className)}>
        {label && (
          <label htmlFor={id} className="text-xs font-semibold tracking-tight text-slate-700 select-none block">
            {label}
          </label>
        )}
        <div className="relative rounded-md shadow-2xs">
          {icon && (
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={cn(
              'w-full rounded-md border border-slate-200 bg-white px-3.5 h-10 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10',
              icon ? 'pl-10' : 'pl-3.5',
              rightElement ? 'pr-10' : 'pr-3.5',
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : '',
            )}
            aria-invalid={!!error}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>
        {description && !error && (
          <p className="text-[11px] leading-normal text-slate-400 font-medium">{description}</p>
        )}
        {error && (
          <p className="text-[11px] font-medium text-red-600 flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';