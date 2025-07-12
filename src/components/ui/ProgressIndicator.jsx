import React from 'react';

export const ProgressBar = ({ 
  progress, 
  total, 
  label, 
  color = "blue", 
  showPercentage = true,
  size = "md" 
}) => {
  const percentage = total > 0 ? (progress / total) * 100 : 0;
  
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500", 
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    gray: "bg-gray-500"
  };

  const sizeClasses = {
    sm: "h-2",
    md: "h-3", 
    lg: "h-4"
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {showPercentage && (
          <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
        )}
      </div>
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div 
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{progress}</span>
        <span>{total}</span>
      </div>
    </div>
  );
};

export const CircularProgress = ({ 
  progress, 
  total, 
  size = 60, 
  strokeWidth = 4,
  color = "blue" 
}) => {
  const percentage = total > 0 ? (progress / total) * 100 : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    blue: "text-blue-500",
    green: "text-green-500",
    red: "text-red-500", 
    yellow: "text-yellow-500",
    purple: "text-purple-500"
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={`${colorClasses[color]} transition-all duration-300 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-700">
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

export const TaskProgress = ({ completed, total, label }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm text-gray-900">{label}</h4>
        <span className="text-xs text-gray-500">{completed}/{total}</span>
      </div>
      <ProgressBar 
        progress={completed} 
        total={total} 
        color="green"
        showPercentage={false}
        size="sm"
      />
    </div>
  );
};

export const SiteProgress = ({ sites, workHours }) => {
  const totalHours = workHours.reduce((sum, site) => sum + site.hours, 0);
  
  return (
    <div className="space-y-3">
      {workHours.map((site, index) => (
        <div key={site.site} className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm text-gray-900">{site.site}</span>
            <span className="text-xs text-gray-500">{site.hours}h</span>
          </div>
          <ProgressBar 
            progress={site.hours} 
            total={totalHours} 
            color={index % 2 === 0 ? "blue" : "purple"}
            showPercentage={false}
            size="sm"
          />
        </div>
      ))}
    </div>
  );
};

export default ProgressBar;