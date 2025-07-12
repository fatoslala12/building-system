import React from 'react';
import Skeleton from './Skeleton';

export const WorkHoursSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 p-6">
      {/* Header Skeleton */}
      <div className="text-center mb-8">
        <Skeleton className="h-8 w-96 mx-auto mb-4" />
        <Skeleton className="h-6 w-64 mx-auto" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

      {/* Table Skeleton */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-100 p-6 mb-8">
        <div className="text-center mb-6">
          <Skeleton className="h-8 w-64 mx-auto" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="py-4 px-3 text-left">
                  <Skeleton className="h-6 w-24" />
                </th>
                {[...Array(7)].map((_, i) => (
                  <th key={i} className="py-4 px-3 text-center">
                    <Skeleton className="h-6 w-16 mx-auto" />
                  </th>
                ))}
                <th className="py-4 px-3 text-center">
                  <Skeleton className="h-6 w-12 mx-auto" />
                </th>
                <th className="py-4 px-3 text-center">
                  <Skeleton className="h-6 w-16 mx-auto" />
                </th>
                <th className="py-4 px-3 text-center">
                  <Skeleton className="h-6 w-16 mx-auto" />
                </th>
                <th className="py-4 px-3 text-center">
                  <Skeleton className="h-6 w-12 mx-auto" />
                </th>
                <th className="py-4 px-3 text-center">
                  <Skeleton className="h-6 w-16 mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {[...Array(3)].map((_, rowIndex) => (
                <tr key={rowIndex} className="text-center">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-4 justify-center">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex flex-col items-start">
                        <Skeleton className="h-6 w-32 mb-1" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  </td>
                  {[...Array(7)].map((_, colIndex) => (
                    <td key={colIndex} className="py-2 px-2">
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-16 mx-auto" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </td>
                  ))}
                  <td className="py-2 px-2">
                    <Skeleton className="h-8 w-16 mx-auto" />
                  </td>
                  <td className="py-2 px-2">
                    <Skeleton className="h-8 w-16 mx-auto" />
                  </td>
                  <td className="py-2 px-2">
                    <Skeleton className="h-8 w-16 mx-auto" />
                  </td>
                  <td className="py-2 px-2">
                    <Skeleton className="h-8 w-16 mx-auto" />
                  </td>
                  <td className="py-2 px-2">
                    <Skeleton className="h-8 w-16 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons Skeleton */}
      <div className="flex justify-center gap-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-12 w-32" />
      </div>
    </div>
  );
};

export default WorkHoursSkeleton;