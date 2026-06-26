'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Spinner } from '../Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/30 active:scale-[0.98]',
  secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-500/20 active:scale-[0.98]',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-500/10 active:scale-[0.98]',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/30 active:scale-[0.98]',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium select-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? 'w-full flex' : 'inline-flex',
          className,
        )}
        {...props}
      >
        {loading && <Spinner className="shrink-0 text-current" />}
        <span>{children}</span>
      </button>
    );
  },
);

Button.displayName = 'Button';