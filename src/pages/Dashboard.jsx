import { useAuth } from "../context/AuthContext";
import TodoList from "../components/TodoList";
import ChangePassword from "../components/ChangePassword";
import WorkHoursTable from "../components/WorkHoursTable";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardStats from "../components/DashboardStats";
import api from "../api";
import { debounce } from "../utils/debounce";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useNotifications } from "../hooks/useWebSocket";
import { Calendar, Download, Filter, Bell, TrendingUp, Clock, Users, MapPin } from "lucide-react";

const getStartOfWeek = (offset = 0) => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  return new Date(today.setDate(diff));
};

const formatDateRange = (startDate) => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [hourData, setHourData] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState(null);
  const { notifications, unreadCount, markAsRead, clearNotifications } = useNotifications();
  const [cachedData, setCachedData] = useLocalStorage('dashboard-cache', {});
  const [lastFetch, setLastFetch] = useLocalStorage('dashboard-last-fetch', 0);

  const currentWeekLabel = formatDateRange(getStartOfWeek());
  const previousWeeks = useMemo(() => [
    { label: formatDateRange(getStartOfWeek(-1)), start: getStartOfWeek(-1) },
    { label: formatDateRange(getStartOfWeek(-2)), start: getStartOfWeek(-2) }
  ], []);

  // Memoized user full name
  const userFullName = useMemo(() => {
    return (user?.first_name && user?.last_name)
      ? `${user.first_name} ${user.last_name}`
      : (user?.firstName && user?.lastName)
        ? `${user.firstName} ${user.lastName}`
        : "";
  }, [user]);

  // Debounced API calls
  const debouncedFetchEmployees = useCallback(
    debounce(async () => {
      try {
        const res = await api.get("/api/employees");
        setEmployees(res.data);
        setCachedData(prev => ({ ...prev, employees: res.data, employeesTimestamp: Date.now() }));
      } catch {
        setEmployees([]);
      }
    }, 300),
    []
  );

  const debouncedFetchTasks = useCallback(
    debounce(async () => {
      try {
        const res = await api.get("/api/tasks");
        setTasks(res.data);
        setCachedData(prev => ({ ...prev, tasks: res.data, tasksTimestamp: Date.now() }));
      } catch {
        setTasks([]);
      }
    }, 300),
    []
  );

  // Cache management
  const shouldRefetch = useCallback(() => {
    const now = Date.now();
    const cacheAge = now - lastFetch;
    return cacheAge > 5 * 60 * 1000; // 5 minutes
  }, [lastFetch]);

  // Fetch data with caching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      if (!shouldRefetch() && cachedData.employees && cachedData.tasks) {
        setEmployees(cachedData.employees);
        setTasks(cachedData.tasks);
        setLoading(false);
        return;
      }

      await Promise.all([
        debouncedFetchEmployees(),
        debouncedFetchTasks()
      ]);
      
      setLastFetch(Date.now());
      setLoading(false);
    };

    fetchData();
  }, []);

  // Fetch work hours with memoization
  useEffect(() => {
    if (employees.length === 0) return;
    
    const fetchHours = async () => {
      const allData = {};
      for (const emp of employees) {
        try {
          const res = await api.get(`/api/work-hours/${emp.id}`);
          allData[emp.id] = res.data || {};
        } catch {
          allData[emp.id] = {};
        }
      }
      setHourData(allData);
    };
    fetchHours();
  }, [employees]);

  // Weather widget
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Mock weather data - replace with real API
        setWeatherData({
          temp: 22,
          condition: 'sunny',
          location: 'London'
        });
      } catch (error) {
        console.error('Weather fetch failed:', error);
      }
    };
    fetchWeather();
  }, []);

  // Real-time notifications handled by WebSocket hook

  const handleChange = useCallback((empId, day, field, value) => {
    setHourData((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [day]: {
          ...prev[empId]?.[day],
          [field]: value,
        },
      },
    }));
  }, []);

  // Quick actions
  const quickActions = useMemo(() => [
    { icon: Calendar, label: 'Kalendar', action: () => window.location.href = '/calendar', color: 'blue' },
    { icon: Download, label: 'Eksport', action: () => window.location.href = '/export', color: 'green' },
    { icon: Filter, label: 'Filtra', action: () => window.location.href = '/filters', color: 'purple' },
    { icon: TrendingUp, label: 'Raporte', action: () => window.location.href = '/reports', color: 'orange' }
  ], []);

  // Memoized filtered tasks
  const userTasks = useMemo(() => 
    tasks.filter((t) => t.assignedTo === user.email && t.status === "ongoing"),
    [tasks, user.email]
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header with reduced font sizes */}
      <div className="mb-6">
        <h1 className="text-lg font-bold mb-2">Mirë se erdhe{userFullName ? `, ${userFullName}` : ""}</h1>
        
        {/* Weather Widget */}
        {weatherData && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg mb-4 flex items-center gap-3">
            <div className="text-2xl">☀️</div>
            <div>
              <div className="text-sm font-medium">{weatherData.temp}°C</div>
              <div className="text-xs text-gray-600">{weatherData.location}</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`p-3 rounded-lg bg-${action.color}-50 hover:bg-${action.color}-100 transition-colors flex flex-col items-center gap-2`}
            >
              <action.icon className="w-5 h-5 text-gray-600" />
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium">Njoftime të reja</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={clearNotifications}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Fshi të gjitha
              </button>
            </div>
            {notifications.slice(-3).map(notification => (
              <div 
                key={notification.id} 
                className={`text-xs text-gray-700 cursor-pointer hover:bg-yellow-100 p-1 rounded ${
                  !notification.read ? 'font-semibold' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                {notification.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Dashboard */}
      {user.role === "user" && (
        <div className="space-y-4">
          <section className="space-y-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <span className="text-red-600">📌</span>
              Detyrat e tua (në vazhdim)
            </h3>

            {userTasks.length === 0 ? (
              <p className="text-gray-500 italic text-sm">Nuk ke detyra aktive për momentin.</p>
            ) : (
              <ul className="space-y-2">
                {userTasks.slice(0, 3).map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-col bg-yellow-50 border-l-4 border-yellow-400 px-3 py-2 rounded-lg shadow hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-2 text-yellow-800 font-medium text-xs">
                      🕒 {t.description || t.title}
                    </div>
                    {t.dueDate && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(t.dueDate) < new Date()
                          ? "❗ Ka kaluar afati!"
                          : `⏳ Afat deri më: ${new Date(t.dueDate).toLocaleDateString()}`}
                      </div>
                    )}
                    {t.siteName && (
                      <div className="text-xs text-gray-500">📍 Site: {t.siteName}</div>
                    )}
                    <div className="text-xs text-green-700 font-semibold mt-1">Statusi: Në vazhdim</div>
                  </li>
                ))}
              </ul>
            )}

            <Link
              to={`/${user.role}/my-tasks`}
              className="inline-block mt-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded transition"
            >
              ➕ Shiko të gjitha detyrat
            </Link>
          </section>

          <section>
            <ChangePassword />
          </section>
        </div>
      )}

      {/* Admin Dashboard */}
      {user.role === "admin" && (
        <div className="space-y-4">
          <section>
            <DashboardStats />
          </section>
        </div>
      )}

      {/* Manager Dashboard */}
      {user.role === "manager" && (
        <div className="space-y-4">
          <section className="space-y-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <span className="text-red-600">📌</span>
              Detyrat e tua (në vazhdim)
            </h3>

            {userTasks.length === 0 ? (
              <p className="text-gray-500 italic text-sm">Nuk ke detyra aktive për momentin.</p>
            ) : (
              <ul className="space-y-2">
                {userTasks.slice(0, 3).map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-col bg-yellow-50 border-l-4 border-yellow-400 px-3 py-2 rounded-lg shadow hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-2 text-yellow-800 font-medium text-xs">
                      🕒 {t.description || t.title}
                    </div>
                    {t.dueDate && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(t.dueDate) < new Date()
                          ? "❗ Ka kaluar afati!"
                          : `⏳ Afat deri më: ${new Date(t.dueDate).toLocaleDateString()}`}
                      </div>
                    )}
                    {t.siteName && (
                      <div className="text-xs text-gray-500">📍 Site: {t.siteName}</div>
                    )}
                    <div className="text-xs text-green-700 font-semibold mt-1">Statusi: Në vazhdim</div>
                  </li>
                ))}
              </ul>
            )}

            <Link
              to={`/${user.role}/my-tasks`}
              className="inline-block mt-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded transition"
            >
              ➕ Shiko të gjitha detyrat
            </Link>
          </section>

          <section>
            <p className="text-gray-600 text-sm">Menaxhoni punonjësit dhe orët e punës për site-t që ju janë caktuar.</p>

            <div className="flex flex-wrap gap-2 mt-3">
              <Link
                to="/admin/employees-list"
                className="inline-block bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-xs"
              >
                ➕ Menaxho Punonjësit
              </Link>

              <Link
                to="/manager/work-hours"
                className="inline-block bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-xs"
              >
                🕒 Orët e Punës
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}