import React from 'react';

export const SkeletonLoader = ({ className = "", ...props }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    {...props}
  />
);

export const SkeletonCard = () => (
  <div className="bg-white p-4 rounded-lg shadow-md">
    <SkeletonLoader className="h-4 w-3/4 mb-2" />
    <SkeletonLoader className="h-3 w-1/2 mb-4" />
    <SkeletonLoader className="h-8 w-full" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="p-4 border-b">
      <SkeletonLoader className="h-4 w-1/3" />
    </div>
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center space-x-4">
          <SkeletonLoader className="h-4 w-8" />
          <SkeletonLoader className="h-4 flex-1" />
          <SkeletonLoader className="h-4 w-24" />
          <SkeletonLoader className="h-4 w-20" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonChart = () => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <SkeletonLoader className="h-6 w-1/2 mb-4" />
    <SkeletonLoader className="h-64 w-full" />
  </div>
);

export const SkeletonStats = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default SkeletonLoader;