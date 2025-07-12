import { useAuth } from "../context/AuthContext";
import TodoList from "../components/TodoList";
import ChangePassword from "../components/ChangePassword";
import WorkHoursTable from "../components/WorkHoursTable";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import DashboardStats from "../components/DashboardStats";
import api from "../api";

const getStartOfWeek = (offset = 0) => {
  const today = new Date();
  const day = today.getDay();
  // Java tradicionale: E Hëna (1) → E Diel (0)
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  return new Date(today.setDate(diff));
};

const formatDateRange = (startDate) => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
};

// Memoized Task Item Component
const TaskItem = memo(({ task }) => (
  <li
    className="flex flex-col bg-yellow-50 border-l-4 border-yellow-400 px-4 py-3 rounded-lg shadow hover:shadow-md transition"
  >
    <div className="flex items-center gap-2 text-yellow-800 font-medium text-xs">
      🕒 {task.description || task.title}
    </div>
    {task.dueDate && (
      <div className="text-xs text-gray-500 mt-1">
        {new Date(task.dueDate) < new Date()
          ? "❗ Ka kaluar afati!"
          : `⏳ Afat deri më: ${new Date(task.dueDate).toLocaleDateString()}`}
      </div>
    )}
    {task.siteName && (
      <div className="text-xs text-gray-500">📍 Site: {task.siteName}</div>
    )}
    <div className="text-xs text-green-700 font-semibold mt-1">Statusi: Në vazhdim</div>
  </li>
));

// Memoized Quick Action Button
const QuickActionButton = memo(({ to, children, className }) => (
  <Link
    to={to}
    className={`inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm ${className}`}
  >
    {children}
  </Link>
));

export default function Dashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [hourData, setHourData] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentWeekLabel = useMemo(() => formatDateRange(getStartOfWeek()), []);
  const previousWeeks = useMemo(() => [
    { label: formatDateRange(getStartOfWeek(-1)), start: getStartOfWeek(-1) },
    { label: formatDateRange(getStartOfWeek(-2)), start: getStartOfWeek(-2) }
  ], []);

  // Merr emër + mbiemër për user-in (mos shfaq email në asnjë rast)
  const userFullName = useMemo(() => {
    return (user?.first_name && user?.last_name)
      ? `${user.first_name} ${user.last_name}`
      : (user?.firstName && user?.lastName)
        ? `${user.firstName} ${user.lastName}`
        : "";
  }, [user]);

  // Memoized filtered tasks
  const userTasks = useMemo(() => 
    tasks.filter((t) => t.assignedTo === user.email && t.status === "ongoing"),
    [tasks, user.email]
  );

  const displayedTasks = useMemo(() => 
    userTasks.slice(0, 3),
    [userTasks]
  );

  // Memoized fetch functions
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get("/api/employees");
      setEmployees(res.data);
    } catch {
      setEmployees([]);
    }
  }, []);

  const fetchHours = useCallback(async () => {
    if (employees.length === 0) return;
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
  }, [employees]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get("/api/tasks");
      setTasks(res.data);
    } catch {
      setTasks([]);
    }
  }, []);

  // Merr punonjësit nga backend
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Merr orët e punës për çdo punonjës nga backend
  useEffect(() => {
    fetchHours();
  }, [fetchHours]);

  // Merr detyrat nga backend
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Set loading to false when all data is loaded
  useEffect(() => {
    if (employees.length >= 0 && tasks.length >= 0) {
      setLoading(false);
    }
  }, [employees.length, tasks.length]);

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
    // Mund të shtosh axios.put/post këtu për të ruajtur ndryshimet në backend
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm">Duke ngarkuar...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-lg font-bold mb-4">Mirë se erdhe{userFullName ? `, ${userFullName}` : ""}</h1>

      {/* Përdorues - Punonjës */}
      {user.role === "user" && (
        <div className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="text-red-600 text-sm">📌</span>
              Detyrat e tua (në vazhdim)
            </h3>

            {userTasks.length === 0 ? (
              <p className="text-gray-500 italic text-sm">Nuk ke detyra aktive për momentin.</p>
            ) : (
              <ul className="space-y-3">
                {displayedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </ul>
            )}

            <Link
              to={`/${user.role}/my-tasks`}
              className="inline-block mt-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-4 py-2 rounded transition"
            >
              ➕ Shiko të gjitha detyrat
            </Link>
          </section>

          <section>
            <ChangePassword />
          </section>
        </div>
      )}

      {/* Admin */}
      {user.role === "admin" && (
        <div className="space-y-6">
          <section>
            <DashboardStats />
          </section>
        </div>
      )}

      {/* Manager */}
      {user.role === "manager" && (
        <div className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="text-red-600 text-sm">📌</span>
              Detyrat e tua (në vazhdim)
            </h3>

            {userTasks.length === 0 ? (
              <p className="text-gray-500 italic text-sm">Nuk ke detyra aktive për momentin.</p>
            ) : (
              <ul className="space-y-3">
                {displayedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </ul>
            )}

            <Link
              to={`/${user.role}/my-tasks`}
              className="inline-block mt-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-4 py-2 rounded transition"
            >
              ➕ Shiko të gjitha detyrat
            </Link>
          </section>

          <section>
            <p className="text-gray-600 text-sm">Menaxhoni punonjësit dhe orët e punës për site-t që ju janë caktuar.</p>

            <div className="flex flex-wrap gap-4 mt-4">
              <QuickActionButton to="/admin/employees-list">
                ➕ Menaxho Punonjësit
              </QuickActionButton>

              <QuickActionButton to="/manager/work-hours" className="bg-green-600 hover:bg-green-700">
                🕒 Orët e Punës
              </QuickActionButton>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}