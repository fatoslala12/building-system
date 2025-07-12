import React, { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';

export default function CalendarView({ tasks = [], onTaskClick }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped = {};
    tasks.forEach(task => {
      if (task.due_date) {
        const dateKey = format(new Date(task.due_date), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  }, [selectedDate, tasksByDate]);

  // Custom tile content
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayTasks = tasksByDate[dateKey] || [];
      
      if (dayTasks.length > 0) {
        return (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
        );
      }
    }
    return null;
  };

  // Custom tile class
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayTasks = tasksByDate[dateKey] || [];
      
      if (dayTasks.length > 0) {
        return 'relative bg-blue-50';
      }
    }
    return '';
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📅 Kalendari i Detyrave</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div>
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            tileContent={tileContent}
            tileClassName={tileClassName}
            className="w-full border-0 shadow-none"
          />
        </div>

        {/* Tasks for selected date */}
        <div>
          <h4 className="text-base font-semibold mb-3">
            Detyrat për {format(selectedDate, 'dd/MM/yyyy')}
          </h4>
          
          {selectedDateTasks.length === 0 ? (
            <p className="text-gray-500 italic text-sm">Nuk ka detyra për këtë datë</p>
          ) : (
            <div className="space-y-2">
              {selectedDateTasks.map((task, index) => (
                <div
                  key={task.id || index}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm text-gray-900">
                        {task.description || task.title}
                      </h5>
                      <p className="text-xs text-gray-600 mt-1">
                        Site: {task.site_name || task.siteName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status === 'completed' ? '✅ Përfunduar' : '🕒 Në vazhdim'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}