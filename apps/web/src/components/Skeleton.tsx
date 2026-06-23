import React from 'react';

interface SkeletonProps {
  height?: string; 
  width?: string; 
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ height = 'h-4', width = 'w-full', className }) => (
  <div className={`bg-slate-200 rounded ${height} ${width} animate-pulse ${className}`} />
);
