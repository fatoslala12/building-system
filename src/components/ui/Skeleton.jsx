import React from 'react';

export const Skeleton = ({ className = "", ...props }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    {...props}
  />
);

export const SkeletonText = ({ lines = 1, className = "" }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4 w-full" />
    ))}
  </div>
);

export const SkeletonCard = ({ className = "" }) => (
  <div className={`bg-white p-6 rounded-xl shadow-md ${className}`}>
    <Skeleton className="h-6 w-3/4 mb-4" />
    <SkeletonText lines={3} />
    <div className="flex gap-2 mt-4">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-24" />
    </div>
  </div>
);

export const SkeletonChart = ({ className = "" }) => (
  <div className={`bg-white p-6 rounded-xl shadow-md ${className}`}>
    <Skeleton className="h-6 w-1/2 mb-6" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export const SkeletonStats = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default Skeleton;