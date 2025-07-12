import React, { useState, useMemo } from 'react';

const QuickFilters = ({ 
  filters, 
  onFilterChange, 
  data, 
  className = "" 
}) => {
  const [activeFilters, setActiveFilters] = useState({});

  const filterOptions = useMemo(() => {
    const options = {};
    
    filters.forEach(filter => {
      if (filter.type === 'select') {
        options[filter.key] = [...new Set(data.map(item => item[filter.key]).filter(Boolean))];
      } else if (filter.type === 'date') {
        options[filter.key] = {
          min: new Date(Math.min(...data.map(item => new Date(item[filter.key])).filter(date => !isNaN(date)))),
          max: new Date(Math.max(...data.map(item => new Date(item[filter.key])).filter(date => !isNaN(date))))
        };
      }
    });
    
    return options;
  }, [filters, data]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...activeFilters };
    
    if (value === '' || value === null) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    onFilterChange({});
  };

  const getFilteredDataCount = () => {
    return data.filter(item => {
      return Object.entries(activeFilters).every(([key, value]) => {
        if (!value) return true;
        
        const filter = filters.find(f => f.key === key);
        if (!filter) return true;
        
        switch (filter.type) {
          case 'select':
            return item[key] === value;
          case 'date':
            const itemDate = new Date(item[key]);
            const filterDate = new Date(value);
            return itemDate.toDateString() === filterDate.toDateString();
          case 'search':
            return item[key]?.toLowerCase().includes(value.toLowerCase());
          default:
            return true;
        }
      });
    }).length;
  };

  return (
    <div className={`bg-white p-4 rounded-xl shadow-md ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">🔍 Filtra të Shpejta</h3>
        {Object.keys(activeFilters).length > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Pastro të gjitha
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filters.map(filter => (
          <div key={filter.key} className="space-y-2">
            <label className="text-xs font-medium text-gray-700">
              {filter.label}
            </label>
            
            {filter.type === 'select' && (
              <select
                value={activeFilters[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Të gjitha</option>
                {filterOptions[filter.key]?.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
            
            {filter.type === 'search' && (
              <input
                type="text"
                placeholder={filter.placeholder || `Kërko ${filter.label.toLowerCase()}...`}
                value={activeFilters[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            
            {filter.type === 'date' && (
              <input
                type="date"
                value={activeFilters[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                min={filterOptions[filter.key]?.min?.toISOString().split('T')[0]}
                max={filterOptions[filter.key]?.max?.toISOString().split('T')[0]}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        ))}
      </div>
      
      {Object.keys(activeFilters).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {getFilteredDataCount()} nga {data.length} rezultate
            </span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(activeFilters).map(([key, value]) => {
                const filter = filters.find(f => f.key === key);
                return (
                  <span
                    key={key}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"
                  >
                    {filter?.label}: {value}
                    <button
                      onClick={() => handleFilterChange(key, '')}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickFilters;