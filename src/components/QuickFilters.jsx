import React, { useState, useMemo } from 'react';
import { Filter, X, Calendar, MapPin, Users, TrendingUp } from 'lucide-react';

export default function QuickFilters({ 
  data = [], 
  onFilterChange, 
  filters = {},
  filterOptions = {} 
}) {
  const [activeFilters, setActiveFilters] = useState(filters);
  const [showFilters, setShowFilters] = useState(false);

  // Generate filter options from data
  const availableFilters = useMemo(() => {
    if (!data || data.length === 0) return {};

    const filters = {};
    
    // Site filter
    if (data.some(item => item.site_name || item.siteName)) {
      const sites = [...new Set(data.map(item => item.site_name || item.siteName).filter(Boolean))];
      filters.site = sites;
    }

    // Status filter
    if (data.some(item => item.status)) {
      const statuses = [...new Set(data.map(item => item.status).filter(Boolean))];
      filters.status = statuses;
    }

    // Date range filter
    if (data.some(item => item.due_date || item.created_at)) {
      const dates = data
        .map(item => item.due_date || item.created_at)
        .filter(Boolean)
        .map(date => new Date(date));
      
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        filters.dateRange = { min: minDate, max: maxDate };
      }
    }

    // Employee filter
    if (data.some(item => item.assigned_to || item.assignedTo)) {
      const employees = [...new Set(data.map(item => item.assigned_to || item.assignedTo).filter(Boolean))];
      filters.employee = employees;
    }

    return { ...filters, ...filterOptions };
  }, [data, filterOptions]);

  const applyFilter = (filterType, value) => {
    const newFilters = {
      ...activeFilters,
      [filterType]: value
    };
    
    // Remove empty filters
    Object.keys(newFilters).forEach(key => {
      if (!newFilters[key] || (Array.isArray(newFilters[key]) && newFilters[key].length === 0)) {
        delete newFilters[key];
      }
    });

    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilter = (filterType) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterType];
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    onFilterChange({});
  };

  const getFilterCount = () => {
    return Object.keys(activeFilters).length;
  };

  const filteredData = useMemo(() => {
    if (!data || Object.keys(activeFilters).length === 0) return data;

    return data.filter(item => {
      // Site filter
      if (activeFilters.site && activeFilters.site.length > 0) {
        const itemSite = item.site_name || item.siteName;
        if (!activeFilters.site.includes(itemSite)) return false;
      }

      // Status filter
      if (activeFilters.status && activeFilters.status.length > 0) {
        if (!activeFilters.status.includes(item.status)) return false;
      }

      // Date range filter
      if (activeFilters.dateRange) {
        const itemDate = new Date(item.due_date || item.created_at);
        if (itemDate < activeFilters.dateRange.min || itemDate > activeFilters.dateRange.max) {
          return false;
        }
      }

      // Employee filter
      if (activeFilters.employee && activeFilters.employee.length > 0) {
        const itemEmployee = item.assigned_to || item.assignedTo;
        if (!activeFilters.employee.includes(itemEmployee)) return false;
      }

      return true;
    });
  }, [data, activeFilters]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <h3 className="font-medium text-sm">Filtra të Shpejta</h3>
          {getFilterCount() > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {getFilterCount()}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          {showFilters ? 'Fsheh' : 'Shfaq'}
        </button>
      </div>

      {/* Active Filters */}
      {getFilterCount() > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(activeFilters).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
              <span>{key}: {Array.isArray(value) ? value.join(', ') : value}</span>
              <button
                onClick={() => clearFilter(key)}
                className="hover:text-blue-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-red-600 hover:text-red-800"
          >
            Fshi të gjitha
          </button>
        </div>
      )}

      {/* Filter Options */}
      {showFilters && (
        <div className="space-y-3">
          {/* Site Filter */}
          {availableFilters.site && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <MapPin className="w-3 h-3 inline mr-1" />
                Site
              </label>
              <select
                multiple
                value={activeFilters.site || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  applyFilter('site', selected);
                }}
                className="w-full border rounded px-2 py-1 text-xs"
              >
                {availableFilters.site.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          {availableFilters.status && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                Statusi
              </label>
              <select
                multiple
                value={activeFilters.status || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  applyFilter('status', selected);
                }}
                className="w-full border rounded px-2 py-1 text-xs"
              >
                {availableFilters.status.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          )}

          {/* Employee Filter */}
          {availableFilters.employee && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Users className="w-3 h-3 inline mr-1" />
                Punonjësi
              </label>
              <select
                multiple
                value={activeFilters.employee || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  applyFilter('employee', selected);
                }}
                className="w-full border rounded px-2 py-1 text-xs"
              >
                {availableFilters.employee.map(employee => (
                  <option key={employee} value={employee}>{employee}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Filter */}
          {availableFilters.dateRange && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Nga
                </label>
                <input
                  type="date"
                  value={activeFilters.dateRange?.min?.toISOString().split('T')[0] || ''}
                  onChange={(e) => {
                    const newRange = {
                      ...activeFilters.dateRange,
                      min: new Date(e.target.value)
                    };
                    applyFilter('dateRange', newRange);
                  }}
                  className="w-full border rounded px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Deri
                </label>
                <input
                  type="date"
                  value={activeFilters.dateRange?.max?.toISOString().split('T')[0] || ''}
                  onChange={(e) => {
                    const newRange = {
                      ...activeFilters.dateRange,
                      max: new Date(e.target.value)
                    };
                    applyFilter('dateRange', newRange);
                  }}
                  className="w-full border rounded px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="text-xs text-gray-500 mt-3">
        {filteredData.length} nga {data.length} rezultate
      </div>
    </div>
  );
}