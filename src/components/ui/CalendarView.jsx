import React, { useState, useMemo } from 'react';

const CalendarView = ({ tasks, onTaskClick, className = "" }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const calendarData = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentMonth, currentYear]);

  const tasksByDate = useMemo(() => {
    const grouped = {};
    tasks.forEach(task => {
      if (task.due_date) {
        const dateKey = new Date(task.due_date).toDateString();
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'ongoing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth;
  };

  const getDayTasks = (date) => {
    const dateKey = date.toDateString();
    return tasksByDate[dateKey] || [];
  };

  return (
    <div className={`bg-white rounded-xl shadow-md ${className}`}>
      {/* Calendar Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              ←
            </button>
            <h2 className="text-lg font-semibold text-gray-800">
              {currentDate.toLocaleDateString('sq-AL', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              →
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded text-xs ${
                viewMode === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Muaj
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded text-xs ${
                viewMode === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Java
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.map((date, index) => {
            const dayTasks = getDayTasks(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);

            return (
              <div
                key={index}
                className={`
                  min-h-[100px] p-2 border border-gray-200 rounded-lg
                  ${isCurrentMonthDay ? 'bg-white' : 'bg-gray-50'}
                  ${isTodayDate ? 'ring-2 ring-blue-500' : ''}
                  hover:bg-gray-50 transition
                `}
              >
                <div className={`
                  text-xs font-medium mb-1
                  ${isCurrentMonthDay ? 'text-gray-900' : 'text-gray-400'}
                  ${isTodayDate ? 'text-blue-600 font-bold' : ''}
                `}>
                  {date.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task, taskIndex) => (
                    <div
                      key={task.id || taskIndex}
                      onClick={() => onTaskClick?.(task)}
                      className={`
                        text-xs p-1 rounded border cursor-pointer
                        ${getTaskStatusColor(task.status)}
                        hover:opacity-80 transition
                      `}
                      title={`${task.description || task.title} - ${task.status}`}
                    >
                      <div className="truncate">
                        {task.description || task.title}
                      </div>
                    </div>
                  ))}
                  
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayTasks.length - 3} më shumë
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span>E përfunduar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
            <span>Në vazhdim</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
            <span>Në pritje</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;