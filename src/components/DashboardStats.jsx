import { useEffect, useState, useMemo, useCallback, memo } from "react";
import api from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Container, Grid, Stack } from "../components/ui/Layout";
import { CountStatCard, MoneyStatCard } from "../components/ui/StatCard";
import { StatusBadge, PaymentBadge } from "../components/ui/Badge";
import EmptyState, { NoTasksEmpty } from "../components/ui/EmptyState";
import Skeleton, { SkeletonStats } from "../components/ui/Skeleton";
import WeatherWidget from "../components/ui/WeatherWidget";
import CalendarView from "../components/ui/CalendarView";
import QuickFilters from "../components/ui/QuickFilters";
import { NotificationContainer, useNotifications } from "../components/ui/Notification";
import { exportDashboardReport, exportTasksReport } from "../utils/exportUtils";
import useWebSocket from "../hooks/useWebSocket";

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// Funksion për të kthyer snake_case në camelCase për një objekt ose array
function snakeToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/_([a-z])/g, g => g[1].toUpperCase()),
        snakeToCamel(value)
      ])
    );
  }
  return obj;
}

// Memoized components
const TaskItem = memo(({ task, contracts }) => {
  const siteName = useMemo(() => {
    if (!task.contract_id || !contracts.length) return '';
    const contract = contracts.find(c => String(c.id) === String(task.contract_id));
    return contract ? (contract.site_name || contract.siteName || '') : '';
  }, [task.contract_id, contracts]);

  return (
    <li className="flex flex-col md:flex-row md:items-center gap-4 bg-white rounded-xl p-4 shadow border border-blue-100">
      <StatusBadge status={task.status === 'completed' ? 'completed' : 'ongoing'} />
      <span className="font-semibold flex-1 text-sm">{task.description || task.title || ''}</span>
      <span className="text-sm text-blue-700 font-bold">{task.site_name || task.siteName || siteName}</span>
      <span className="text-sm text-purple-700 font-bold">Afati: {task.due_date ? new Date(task.due_date).toLocaleDateString() : ''}</span>
      <span className="text-xs text-gray-500">Nga: {task.assigned_by || task.assignedBy || ''}</span>
    </li>
  );
});

const EmployeeCard = memo(({ employee, index }) => (
  <li className="flex items-center gap-6 bg-blue-50 p-5 rounded-2xl shadow-md border border-blue-200">
    <div className="w-14 h-14 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl border-2 border-blue-300 shadow">
      {index + 1}
    </div>
    <div className="flex-1">
      <p className="font-bold text-sm">
        {employee.name}
      </p>
      <p className="text-xs text-gray-600">
        {employee.isPaid ? '✅ E paguar' : '⏳ E papaguar'}
      </p>
    </div>
    <div className="text-blue-700 font-extrabold text-sm">£{employee.grossAmount.toFixed(2)}</div>
  </li>
));

const UnpaidInvoiceItem = memo(({ item }) => (
  <li className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
    <span className="font-bold text-xs">🔴 Kontrata #{item.contractNumber || ''}</span>
    <span className="font-bold text-black text-xs">Nr. Fature: <b>{item.invoiceNumber || ''}</b></span>
    <span className="font-bold text-black flex items-center gap-1 text-xs">🏢 Site: <b>{item.siteName || ''}</b></span>
    <span className="font-bold text-sm flex items-center gap-1">💷 {item.total !== undefined ? `£${item.total.toFixed(2)}` : ''}</span>
  </li>
));

const UnpaidExpenseItem = memo(({ item, contracts }) => {
  const siteName = useMemo(() => {
    if (!item.contract_id || !contracts.length) return '';
    const contract = contracts.find(c => String(c.id) === String(item.contract_id));
    return contract ? (contract.site_name || contract.siteName || '') : '';
  }, [item.contract_id, contracts]);

  return (
    <li className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
      <span className="font-bold flex items-center gap-1 text-xs">📅 {item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
      <span className="font-bold text-sm">{item.type || ''}</span>
      <span className="font-bold text-sm flex items-center gap-1">💷 {item.gross !== undefined ? `£${item.gross.toFixed(2)}` : ''}</span>
      <span className="font-bold text-blue-700 flex items-center gap-1 text-xs">🏢 {siteName}</span>
      <span className="text-gray-700 text-xs">{item.description || ''}</span>
    </li>
  );
});

// Export Button Component
const ExportButton = memo(({ onClick, children, className = "" }) => (
  <button
    onClick={onClick}
    className={`bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold px-4 py-2 rounded-lg shadow-lg hover:from-emerald-500 hover:to-green-500 transition text-sm ${className}`}
  >
    {children}
  </button>
));

export default function DashboardStats() {
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    thisWeek: '',
    totalPaid: 0,
    totalProfit: 0,
    workHoursBysite: [],
    top5Employees: [],
    totalWorkHours: 0,
    paidEmployeesCount: 0,
    totalEmployeesWithHours: 0
  });
  const [unpaid, setUnpaid] = useState([]);
  const [unpaidExpenses, setUnpaidExpenses] = useState([]);
  const [taskStats, setTaskStats] = useState({ totalTasks: 0, completedTasks: 0, ongoingTasks: 0 });
  const [taskFilter, setTaskFilter] = useState('ongoing');
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'calendar', 'filters'
  const [activeFilters, setActiveFilters] = useState({});

  // Notifications
  const { notifications, addNotification, removeNotification } = useNotifications();

  // Debounced task filter
  const debouncedTaskFilter = useDebounce(taskFilter, 300);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // WebSocket for real-time updates
  const { sendMessage } = useWebSocket('ws://localhost:3001', {
    onMessage: (data) => {
      if (data.type === 'task_update') {
        addNotification('Detyrë e re e shtuar!', 'info');
        // Refresh data
        fetchData();
      } else if (data.type === 'payment_update') {
        addNotification('Pagesë e re e regjistruar!', 'success');
        fetchData();
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  // Memoized calculations
  const activeSites = useMemo(() => 
    [...new Set(contracts.filter(c => c.status === "Aktive").map(c => c.siteName))], 
    [contracts]
  );

  const activeEmployees = useMemo(() => 
    employees.filter(e => e.status === "Aktiv"), 
    [employees]
  );

  const filteredTasks = useMemo(() => {
    let tasks = allTasks.filter(t => debouncedTaskFilter === 'all' ? true : t.status === debouncedTaskFilter);
    
    // Apply additional filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value) return;
      
      switch (key) {
        case 'site':
          tasks = tasks.filter(t => (t.site_name || t.siteName || '').includes(value));
          break;
        case 'assignedTo':
          tasks = tasks.filter(t => (t.assignedTo || '').includes(value));
          break;
        case 'dueDate':
          const filterDate = new Date(value);
          tasks = tasks.filter(t => {
            if (!t.due_date) return false;
            const taskDate = new Date(t.due_date);
            return taskDate.toDateString() === filterDate.toDateString();
          });
          break;
        default:
          break;
      }
    });
    
    return tasks;
  }, [allTasks, debouncedTaskFilter, activeFilters]);

  const user = useMemo(() => JSON.parse(localStorage.getItem("user")), []);
  const userFullName = useMemo(() => {
    return (user?.first_name && user?.last_name)
      ? `${user.first_name} ${user.last_name}`
      : (user?.firstName && user?.lastName)
        ? `${user.firstName} ${user.lastName}`
        : "";
  }, [user]);

  // Chart colors for different chart types
  const chartColors = useMemo(() => ({
    pie: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    bar: '#3b82f6',
    line: '#3b82f6',
    area: '#3b82f6'
  }), []);

  // Quick filters configuration
  const taskFilters = useMemo(() => [
    { key: 'site', label: 'Site', type: 'search', placeholder: 'Kërko site...' },
    { key: 'assignedTo', label: 'Caktuar për', type: 'search', placeholder: 'Kërko punonjës...' },
    { key: 'dueDate', label: 'Afati', type: 'date' },
    { key: 'status', label: 'Statusi', type: 'select' }
  ], []);

  // Memoized fetch function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try the new optimized API first, fallback to manual calculation if it fails
      let dashboardData = null;
      try {
        const dashboardRes = await api.get("/api/work-hours/dashboard-stats");
        dashboardData = snakeToCamel(dashboardRes.data || {});
        console.log('[DEBUG] Dashboard API success:', dashboardData);
        console.log('[DEBUG] Dashboard totalPaid:', dashboardData?.totalPaid);
        console.log('[DEBUG] Dashboard top5Employees:', dashboardData?.top5Employees);
      } catch (dashboardError) {
        console.log('[DEBUG] Dashboard API failed, using fallback:', dashboardError.message);
        console.error('[DEBUG] Dashboard API error details:', dashboardError);
      }
      
      const [contractsRes, employeesRes, invoicesRes, tasksRes, expensesRes, paymentsRes, workHoursRes] = await Promise.all([
        api.get("/api/contracts"),
        api.get("/api/employees"),
        api.get("/api/invoices"),
        api.get("/api/tasks"),
        api.get("/api/expenses"),
        api.get("/api/payments"),
        api.get("/api/work-hours/structured"),
      ]);
      
      setContracts(snakeToCamel(contractsRes.data || []));
      setEmployees(snakeToCamel(employeesRes.data || []));
      
      const invoices = snakeToCamel(invoicesRes.data || []);
      const allTasksData = snakeToCamel(tasksRes.data || []);
      const allExpenses = snakeToCamel(expensesRes.data || []);
      const allPayments = snakeToCamel(paymentsRes.data || []);
      const structuredWorkHours = snakeToCamel(workHoursRes.data || {});
      
      // Calculate current week
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const thisWeek = `${monday.toISOString().slice(0, 10)} - ${sunday.toISOString().slice(0, 10)}`;
      
      // Use dashboard API data if available, otherwise calculate manually
      if (dashboardData && Object.keys(dashboardData).length > 0) {
        setDashboardStats(dashboardData);
      } else {
        console.log('[DEBUG] Calculating dashboard stats manually');
        
        // Manual calculation as fallback
        const thisWeekPayments = allPayments.filter(p => p.weekLabel === thisWeek);
        const paidThisWeek = thisWeekPayments.filter(p => p.isPaid === true);
        const totalPaid = paidThisWeek.reduce((sum, p) => sum + parseFloat(p.grossAmount || 0), 0);
        
        // Calculate work hours for this week
        let totalWorkHours = 0;
        const siteHours = {};
        
        Object.entries(structuredWorkHours).forEach(([empId, empData]) => {
          const weekData = empData[thisWeek] || {};
          Object.values(weekData).forEach(dayData => {
            if (dayData?.hours) {
              const hours = parseFloat(dayData.hours);
              totalWorkHours += hours;
              if (dayData.site) {
                siteHours[dayData.site] = (siteHours[dayData.site] || 0) + hours;
              }
            }
          });
        });
        
        // Top 5 employees by payment amount
        const top5Employees = thisWeekPayments
          .sort((a, b) => parseFloat(b.grossAmount || 0) - parseFloat(a.grossAmount || 0))
          .slice(0, 5)
          .map(p => {
            const emp = employeesRes.data.find(e => e.id === p.employeeId);
            return {
              id: p.employeeId,
              name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
              grossAmount: parseFloat(p.grossAmount || 0),
              isPaid: p.isPaid
            };
          });
        
        setDashboardStats({
          thisWeek: thisWeek,
          totalPaid: totalPaid,
          totalProfit: totalPaid * 0.20,
          workHoursBysite: Object.entries(siteHours).map(([site, hours]) => ({ site, hours })),
          top5Employees: top5Employees,
          totalWorkHours: totalWorkHours,
          paidEmployeesCount: paidThisWeek.length,
          totalEmployeesWithHours: Object.keys(structuredWorkHours).length
        });
      }
      
      setAllTasks(allTasksData);
      
      // Process unpaid invoices
      const unpaidList = [];
      invoices.forEach(inv => {
        if (inv && !inv.paid && Array.isArray(inv.items)) {
          const net = inv.items.reduce((a, i) => a + (i.amount || 0), 0);
          const vat = net * 0.2;
          const total = net + vat + parseFloat(inv.other || 0);
          if (total <= 0) return;
          const contract = contractsRes.data.find(c => c.contract_number === inv.contract_number);
          unpaidList.push({
            contractNumber: inv.contractNumber,
            invoiceNumber: inv.invoiceNumber || "-",
            total,
            siteName: contract?.site_name || "-"
          });
        }
      });
      setUnpaid(unpaidList);
      
      // Process tasks
      const totalTasks = allTasksData.length;
      const completedTasks = allTasksData.filter(t => t.status === "completed").length;
      const ongoingTasks = totalTasks - completedTasks;
      setTaskStats({ totalTasks, completedTasks, ongoingTasks });
      
      // Process unpaid expenses
      const unpaidExpensesList = [];
      allExpenses.forEach(exp => {
        if (exp && (exp.paid === false || exp.paid === 0 || exp.paid === 'false')) {
          unpaidExpensesList.push({
            id: exp.id,
            date: exp.date,
            type: exp.expenseType,
            gross: parseFloat(exp.gross || 0),
            contract_id: exp.contractId,
            description: exp.description
          });
        }
      });
      setUnpaidExpenses(unpaidExpensesList);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      addNotification('Gabim në ngarkimin e të dhënave', 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Export handlers
  const handleExportDashboard = useCallback(() => {
    try {
      exportDashboardReport(dashboardStats);
      addNotification('Raporti u eksportua me sukses!', 'success');
    } catch (error) {
      addNotification('Gabim në eksportimin e raportit', 'error');
    }
  }, [dashboardStats, addNotification]);

  const handleExportTasks = useCallback(() => {
    try {
      exportTasksReport(allTasks);
      addNotification('Detyrat u eksportuan me sukses!', 'success');
    } catch (error) {
      addNotification('Gabim në eksportimin e detyrave', 'error');
    }
  }, [allTasks, addNotification]);

  const handleTaskClick = useCallback((task) => {
    addNotification(`Detyrë: ${task.description || task.title}`, 'info');
    // You can add navigation to task details here
  }, [addNotification]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
        <SkeletonStats />
        <SkeletonChart />
        <SkeletonChart />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      {/* Notifications */}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      {/* HEADER MODERN */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl shadow-lg px-10 py-6 mb-8 border-b-2 border-blue-200 animate-fade-in w-full">
        <div className="flex-shrink-0 bg-blue-100 rounded-xl p-3 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-12 h-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold mb-2 text-gray-900">Mirë se erdhe{userFullName ? `, ${userFullName}` : ""}</h2>
          <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">Paneli i Administrimit</div>
          <div className="text-sm font-medium text-purple-700">Statistika, detyra, pagesa dhe më shumë</div>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              viewMode === 'dashboard' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              viewMode === 'calendar' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            📅 Kalendar
          </button>
          <button
            onClick={() => setViewMode('filters')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              viewMode === 'filters' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            🔍 Filtra
          </button>
        </div>
      </div>

      {/* Weather Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeSites.slice(0, 3).map((site, index) => (
          <WeatherWidget key={index} siteName={site} />
        ))}
      </div>

      {/* Export Buttons */}
      <div className="flex gap-4 justify-center">
        <ExportButton onClick={handleExportDashboard}>
          📊 Eksporto Raportin
        </ExportButton>
        <ExportButton onClick={handleExportTasks}>
          📋 Eksporto Detyrat
        </ExportButton>
      </div>

      {/* View Mode Content */}
      {viewMode === 'dashboard' && (
        <>
          {/* Statistika kryesore */}
          <Grid cols={{ xs: 1, sm: 2, lg: 4 }} gap="lg" className="mb-12">
            <CountStatCard
              title="Site aktive"
              count={activeSites.length}
              icon="📍"
              color="blue"
            />
            <CountStatCard
              title="Punonjës aktivë"
              count={activeEmployees.length}
              icon="👷"
              color="green"
            />
            <MoneyStatCard
              title="Paguar këtë javë"
              amount={dashboardStats.totalPaid}
              color="purple"
            />
            <MoneyStatCard
              title="Fitimi (20%)"
              amount={dashboardStats.totalProfit}
              color="amber"
            />
          </Grid>

          {/* Detyrat - më të dukshme */}
          <div className="bg-gradient-to-r from-yellow-50 via-white to-green-50 p-8 rounded-2xl shadow-xl col-span-full border border-yellow-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📋 Detyrat</h3>
            <div className="mb-4 flex gap-4 items-center">
              <label className="font-medium text-sm">Filtro:</label>
              <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)} className="border p-2 rounded text-sm">
                <option value="ongoing">Vetëm aktive</option>
                <option value="completed">Vetëm të përfunduara</option>
                <option value="all">Të gjitha</option>
              </select>
            </div>
            <div className="mb-4 flex flex-wrap gap-6">
              <div className="bg-blue-100 px-6 py-3 rounded-xl text-blue-800 font-bold shadow text-sm">Totali: {allTasks.length}</div>
              <div className="bg-green-100 px-6 py-3 rounded-xl text-green-800 font-bold shadow text-sm">✅ Të përfunduara: {allTasks.filter(t => t.status === 'completed').length}</div>
              <div className="bg-yellow-100 px-6 py-3 rounded-xl text-yellow-800 font-bold shadow text-sm">🕒 Në vazhdim: {allTasks.filter(t => t.status === 'ongoing').length}</div>
            </div>
            {filteredTasks.length > 0 ? (
              <ul className="space-y-3">
                {filteredTasks.map((task, idx) => (
                  <TaskItem key={task.id || idx} task={task} contracts={contracts} />
                ))}
              </ul>
            ) : (
              <NoTasksEmpty />
            )}
          </div>

          {/* Grafik për site */}
          <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📊 Ora të punuara këtë javë sipas site-ve ({dashboardStats.thisWeek})</h3>
            <div className="mb-4 text-sm font-semibold text-gray-700">
              Total orë të punuara: <span className="text-blue-600">{dashboardStats.totalWorkHours}</span> orë
            </div>
            {dashboardStats.workHoursBysite && dashboardStats.workHoursBysite.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dashboardStats.workHoursBysite} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: "Orë", position: "insideBottomRight", offset: -5 }} />
                  <YAxis type="category" dataKey="site" width={200} tick={{ fontSize: 14, fontWeight: 'bold', fill: '#3b82f6' }} />
                  <Tooltip />
                  <Bar dataKey="hours" fill={chartColors.bar} radius={[0, 6, 6, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 italic text-center py-8 text-sm">Nuk ka orë pune të regjistruara për këtë javë</p>
            )}
          </div>

          {/* Pie Chart për shpërndarjen e detyrave */}
          <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🥧 Shpërndarja e Detyrave</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Të përfunduara', value: taskStats.completedTasks, color: '#10b981' },
                        { name: 'Në vazhdim', value: taskStats.ongoingTasks, color: '#f59e0b' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Të përfunduara', value: taskStats.completedTasks, color: '#10b981' },
                        { name: 'Në vazhdim', value: taskStats.ongoingTasks, color: '#f59e0b' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="bg-green-100 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-green-800">{taskStats.completedTasks}</div>
                  <div className="text-sm text-green-600">Detyra të përfunduara</div>
                </div>
                <div className="bg-yellow-100 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-yellow-800">{taskStats.ongoingTasks}</div>
                  <div className="text-sm text-yellow-600">Detyra në vazhdim</div>
                </div>
                <div className="bg-blue-100 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-blue-800">{taskStats.totalTasks}</div>
                  <div className="text-sm text-blue-600">Total detyra</div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Chart për trendin e pagesave */}
          <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📈 Trendi i Pagesave (4 javët e fundit)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[
                { week: 'Javë 1', amount: dashboardStats.totalPaid * 0.8 },
                { week: 'Javë 2', amount: dashboardStats.totalPaid * 0.9 },
                { week: 'Javë 3', amount: dashboardStats.totalPaid * 0.95 },
                { week: 'Kjo javë', amount: dashboardStats.totalPaid }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(value) => [`£${value.toFixed(2)}`, 'Shuma']} />
                <Line type="monotone" dataKey="amount" stroke={chartColors.line} strokeWidth={3} dot={{ fill: chartColors.line, strokeWidth: 2, r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Area Chart për orët e punës */}
          <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📊 Ora të Punuara (7 ditët e fundit)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={[
                { day: 'E Hënë', hours: Math.floor(dashboardStats.totalWorkHours * 0.15) },
                { day: 'E Martë', hours: Math.floor(dashboardStats.totalWorkHours * 0.18) },
                { day: 'E Mërkurë', hours: Math.floor(dashboardStats.totalWorkHours * 0.20) },
                { day: 'E Enjte', hours: Math.floor(dashboardStats.totalWorkHours * 0.17) },
                { day: 'E Premte', hours: Math.floor(dashboardStats.totalWorkHours * 0.16) },
                { day: 'E Shtunë', hours: Math.floor(dashboardStats.totalWorkHours * 0.10) },
                { day: 'E Diel', hours: Math.floor(dashboardStats.totalWorkHours * 0.04) }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} orë`, 'Ora']} />
                <Area type="monotone" dataKey="hours" stroke={chartColors.area} fill={chartColors.area} fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Progress Indicators */}
          <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📊 Indikatorët e Progresit</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-800">Efektiviteti</span>
                  <span className="text-lg font-bold text-blue-600">
                    {taskStats.totalTasks > 0 ? Math.round((taskStats.completedTasks / taskStats.totalTasks) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${taskStats.totalTasks > 0 ? (taskStats.completedTasks / taskStats.totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-green-800">Pagesa</span>
                  <span className="text-lg font-bold text-green-600">
                    {dashboardStats.totalEmployeesWithHours > 0 ? Math.round((dashboardStats.paidEmployeesCount / dashboardStats.totalEmployeesWithHours) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${dashboardStats.totalEmployeesWithHours > 0 ? (dashboardStats.paidEmployeesCount / dashboardStats.totalEmployeesWithHours) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-800">Fitimi</span>
                  <span className="text-lg font-bold text-purple-600">
                    {dashboardStats.totalPaid > 0 ? Math.round((dashboardStats.totalProfit / dashboardStats.totalPaid) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${dashboardStats.totalPaid > 0 ? (dashboardStats.totalProfit / dashboardStats.totalPaid) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-amber-800">Aktiviteti</span>
                  <span className="text-lg font-bold text-amber-600">
                    {activeSites.length > 0 ? Math.round((activeEmployees.length / activeSites.length) * 10) : 0}%
                  </span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div 
                    className="bg-amber-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${activeSites.length > 0 ? (activeEmployees.length / activeSites.length) * 10 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Top 5 më të paguar */}
          <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🏅 Top 5 punonjësit më të paguar këtë javë</h3>
            {dashboardStats.top5Employees && dashboardStats.top5Employees.length > 0 ? (
              <ul className="space-y-3 text-gray-800">
                {dashboardStats.top5Employees.map((employee, i) => (
                  <EmployeeCard key={employee.id} employee={employee} index={i} />
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic text-center py-8 text-sm">Nuk ka pagesa të regjistruara për këtë javë</p>
            )}
          </div>

          {/* Faturat e papaguara */}
          <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📌 Faturat e Papaguara</h3>
            {unpaid.length === 0 ? (
              <p className="text-gray-500 italic text-sm">Të gjitha faturat janë të paguara ✅</p>
            ) : (
              <ul className="space-y-2 text-red-700 text-sm">
                {unpaid.map((item, idx) => (
                  <UnpaidInvoiceItem key={idx} item={item} />
                ))}
              </ul>
            )}
          </div>

          {/* Shpenzimet e papaguara */}
          <div className="bg-white p-8 rounded-2xl shadow-md col-span-full mb-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📂 Shpenzimet e Papaguara</h3>
            {unpaidExpenses.length === 0 ? (
              <p className="text-gray-500 italic text-sm">Të gjitha shpenzimet janë të paguara ✅</p>
            ) : (
              <ul className="space-y-2 text-red-700 text-sm">
                {unpaidExpenses.map((item, idx) => (
                  <UnpaidExpenseItem key={idx} item={item} contracts={contracts} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {viewMode === 'calendar' && (
        <CalendarView 
          tasks={allTasks} 
          onTaskClick={handleTaskClick}
          className="col-span-full"
        />
      )}

      {viewMode === 'filters' && (
        <QuickFilters
          filters={taskFilters}
          onFilterChange={setActiveFilters}
          data={allTasks}
          className="col-span-full"
        />
      )}

      {/* Butoni Dil */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:from-pink-500 hover:to-red-500 transition text-sm"
        >
          🚪 Dil
        </button>
      </div>
    </div>
  );
}
