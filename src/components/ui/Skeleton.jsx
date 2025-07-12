import React from 'react';

const Skeleton = ({ className = "", ...props }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    {...props}
  />
);

export const DashboardSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-10 space-y-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
    {/* Header Skeleton */}
    <div className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl shadow-lg px-10 py-6 mb-8 border-b-2 border-blue-200 w-full">
      <Skeleton className="w-16 h-16 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>

    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl shadow-md">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>

    {/* Quick Actions Skeleton */}
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-100 p-4 rounded-xl">
            <Skeleton className="w-8 h-8 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        ))}
      </div>
    </div>

    {/* Tasks Section Skeleton */}
    <div className="bg-gradient-to-r from-yellow-50 via-white to-green-50 p-8 rounded-2xl shadow-xl border border-yellow-200">
      <Skeleton className="h-8 w-32 mb-4" />
      <div className="mb-4 flex gap-4 items-center">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="mb-4 flex flex-wrap gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-32" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow border border-blue-100">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <Skeleton className="w-16 h-6" />
              <Skeleton className="h-6 flex-1" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Chart Skeleton */}
    <div className="bg-white p-8 rounded-2xl shadow-md">
      <Skeleton className="h-8 w-64 mb-4" />
      <Skeleton className="h-4 w-48 mb-8" />
      <Skeleton className="h-80 w-full" />
    </div>

    {/* Top Employees Skeleton */}
    <div className="bg-white p-8 rounded-2xl shadow-md">
      <Skeleton className="h-8 w-64 mb-4" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-6 bg-blue-50 p-5 rounded-2xl shadow-md border border-blue-200">
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const CardSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl shadow-md">
    <Skeleton className="h-6 w-32 mb-4" />
    <Skeleton className="h-8 w-16 mb-2" />
    <Skeleton className="h-4 w-20" />
  </div>
);

export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="bg-white rounded-2xl shadow-md overflow-hidden">
    <div className="p-6 border-b">
      <Skeleton className="h-6 w-32" />
    </div>
    <div className="p-6">
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-4">
            {[...Array(columns)].map((_, j) => (
              <Skeleton key={j} className="h-6 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default Skeleton;