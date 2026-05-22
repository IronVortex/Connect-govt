import React from 'react';

interface SkeletonProps {
  height?: string; // e.g., 'h-4', 'h-6', etc.
  width?: string; // optional width class
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ height = 'h-4', width = 'w-full', className }) => (
  <div className={`bg-slate-200 rounded ${height} ${width} animate-pulse ${className}`} />
);
