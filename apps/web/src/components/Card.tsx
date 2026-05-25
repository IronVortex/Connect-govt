import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className }) => (
  <div className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${className}`}>
    {title && (
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-semibold text-[#0F172A]">{title}</h3>
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);
