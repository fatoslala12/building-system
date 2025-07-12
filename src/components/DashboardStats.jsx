import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from "recharts";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Container, Grid, Stack } from "../components/ui/Layout";
import { CountStatCard, MoneyStatCard } from "../components/ui/StatCard";
import { StatusBadge, PaymentBadge } from "../components/ui/Badge";
import EmptyState, { NoTasksEmpty } from "../components/ui/EmptyState";
import { Download, Filter, Calendar, TrendingUp, Clock, Users, MapPin, RefreshCw } from "lucide-react";
import { debounce } from "../utils/debounce";
import { useLocalStorage } from "../hooks/useLocalStorage";
import * as XLSX from 'xlsx';
import { TaskProgress, SiteProgress, CircularProgress } from "./ui/ProgressIndicator";
import ExportFunctionality from "./ExportFunctionality";
import QuickFilters from "./QuickFilters";

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

// Export functionality
const exportToExcel = (data, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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
  const [chartType, setChartType] = useState('bar');
  const [timeRange, setTimeRange] = useState('week');
  const [cachedData, setCachedData] = useLocalStorage('dashboard-stats-cache', {});
  const [lastFetch, setLastFetch] = useLocalStorage('dashboard-stats-last-fetch', 0);
  const [activeFilters, setActiveFilters] = useState({});

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

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
    let filtered = allTasks.filter(t => taskFilter === 'all' ? true : t.status === taskFilter);
    
    // Apply quick filters
    if (Object.keys(activeFilters).length > 0) {
      filtered = filtered.filter(item => {
        // Site filter
        if (activeFilters.site && activeFilters.site.length > 0) {
          const itemSite = item.site_name || item.siteName;
          if (!activeFilters.site.includes(itemSite)) return false;
        }

        // Employee filter
        if (activeFilters.employee && activeFilters.employee.length > 0) {
          const itemEmployee = item.assigned_to || item.assignedTo;
          if (!activeFilters.employee.includes(itemEmployee)) return false;
        }

        // Date range filter
        if (activeFilters.dateRange) {
          const itemDate = new Date(item.due_date || item.created_at);
          if (itemDate < activeFilters.dateRange.min || itemDate > activeFilters.dateRange.max) {
            return false;
          }
        }

        return true;
      });
    }
    
    return filtered;
  }, [allTasks, taskFilter, activeFilters]);

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!dashboardStats.workHoursBysite) return [];
    
    switch (chartType) {
      case 'pie':
        return dashboardStats.workHoursBysite.map((item, index) => ({
          ...item,
          fill: COLORS[index % COLORS.length]
        }));
      case 'area':
        return dashboardStats.workHoursBysite.map((item, index) => ({
          ...item,
          fill: COLORS[index % COLORS.length]
        }));
      default:
        return dashboardStats.workHoursBysite;
    }
  }, [dashboardStats.workHoursBysite, chartType]);

  // Debounced API calls
  const debouncedFetchData = useCallback(
    debounce(async () => {
      try {
        setLoading(true);
        
        // Try the new optimized API first, fallback to manual calculation if it fails
        let dashboardData = null;
        try {
          const dashboardRes = await api.get("/api/work-hours/dashboard-stats");
          dashboardData = snakeToCamel(dashboardRes.data || {});
        } catch (dashboardError) {
          console.log('[DEBUG] Dashboard API failed, using fallback:', dashboardError.message);
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
        
        // Cache the data
        setCachedData({
          contracts: contractsRes.data,
          employees: employeesRes.data,
          tasks: allTasksData,
          dashboardStats: dashboardStats,
          timestamp: Date.now()
        });
        setLastFetch(Date.now());
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  // useEffect për të marrë të dhënat dhe llogaritë dashboard stats
  useEffect(() => {
    const shouldRefetch = () => {
      const now = Date.now();
      const cacheAge = now - lastFetch;
      return cacheAge > 5 * 60 * 1000; // 5 minutes
    };

    if (!shouldRefetch() && cachedData.contracts && cachedData.employees) {
      setContracts(snakeToCamel(cachedData.contracts));
      setEmployees(snakeToCamel(cachedData.employees));
      setAllTasks(cachedData.tasks || []);
      if (cachedData.dashboardStats) {
        setDashboardStats(cachedData.dashboardStats);
      }
      setLoading(false);
      return;
    }

    debouncedFetchData();
  }, []);

  // Export functions
  const exportTasks = useCallback(() => {
    const exportData = filteredTasks.map(task => ({
      'Përshkrimi': task.description || task.title,
      'Site': task.site_name || task.siteName,
      'Statusi': task.status,
      'Afati': task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
      'Caktuar nga': task.assigned_by || task.assignedBy
    }));
    exportToExcel(exportData, 'detyrat');
  }, [filteredTasks]);

  const exportWorkHours = useCallback(() => {
    const exportData = dashboardStats.workHoursBysite.map(site => ({
      'Site': site.site,
      'Orë të punuara': site.hours
    }));
    exportToExcel(exportData, 'ore_pune');
  }, [dashboardStats.workHoursBysite]);

  // Merr emër + mbiemër për user-in (mos shfaq email në asnjë rast)
  const user = JSON.parse(localStorage.getItem("user"));
  const userFullName = (user?.first_name && user?.last_name)
    ? `${user.first_name} ${user.last_name}`
    : (user?.firstName && user?.lastName)
      ? `${user.firstName} ${user.lastName}`
      : "";

  if (loading) {
    return <LoadingSpinner fullScreen={true} size="xl" text="Duke ngarkuar statistikat..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      {/* HEADER MODERN - Reduced font sizes */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl shadow-lg px-6 py-4 mb-6 border-b-2 border-blue-200 animate-fade-in w-full">
        <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold mb-1 text-gray-900">Mirë se erdhe{userFullName ? `, ${userFullName}` : ""}</h2>
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">Paneli i Administrimit</div>
          <div className="text-sm font-medium text-purple-700">Statistika, detyra, pagesa dhe më shumë</div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={debouncedFetchData}
            className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
            title="Rifresko"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Statistika kryesore - Reduced font sizes */}
      <Grid cols={{ xs: 1, sm: 2, lg: 4 }} gap="md" className="mb-8">
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

      {/* Detyrat - më të dukshme - Reduced font sizes */}
      <div className="bg-gradient-to-r from-yellow-50 via-white to-green-50 p-6 rounded-xl shadow-lg col-span-full border border-yellow-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">📋 Detyrat</h3>
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Filtro:</label>
            <select 
              value={taskFilter} 
              onChange={e => setTaskFilter(e.target.value)} 
              className="border p-1.5 rounded text-sm"
            >
              <option value="ongoing">Vetëm aktive</option>
              <option value="completed">Vetëm të përfunduara</option>
              <option value="all">Të gjitha</option>
            </select>
          </div>
        </div>
        
        {/* Progress Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <TaskProgress 
            completed={allTasks.filter(t => t.status === 'completed').length}
            total={allTasks.length}
            label="Përparimi i Detyrave"
          />
          <div className="flex items-center justify-center">
            <CircularProgress 
              progress={allTasks.filter(t => t.status === 'completed').length}
              total={allTasks.length}
              color="green"
              size={80}
            />
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{allTasks.length}</div>
              <div className="text-xs text-blue-700">Total Detyra</div>
            </div>
          </div>
        </div>
        
        {filteredTasks.length > 0 ? (
          <ul className="space-y-2">
            {filteredTasks.map((t, idx) => (
              <li key={t.id || idx} className="flex flex-col md:flex-row md:items-center gap-3 bg-white rounded-lg p-3 shadow border border-blue-100">
                <StatusBadge status={t.status === 'completed' ? 'completed' : 'ongoing'} />
                <span className="font-semibold flex-1 text-sm">{t.description || t.title || ''}</span>
                <span className="text-sm text-blue-700 font-bold">{t.site_name || t.siteName || ''}</span>
                <span className="text-sm text-purple-700 font-bold">Afati: {t.due_date ? new Date(t.due_date).toLocaleDateString() : ''}</span>
                <span className="text-xs text-gray-500">Nga: {t.assigned_by || t.assignedBy || ''}</span>
              </li>
            ))}
          </ul>
        ) : (
          <NoTasksEmpty />
        )}
      </div>

      {/* Export Functionality and Quick Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExportFunctionality data={allTasks} type="tasks" />
          <ExportFunctionality data={employees} type="employees" />
          <ExportFunctionality data={dashboardStats.workHoursBysite} type="workHours" />
          <ExportFunctionality data={dashboardStats.top5Employees} type="payments" />
        </div>
        <QuickFilters 
          data={allTasks} 
          onFilterChange={setActiveFilters}
          filters={activeFilters}
        />
      </div>

      {/* Grafik për site - Interactive charts */}
      <div className="bg-white p-6 rounded-xl shadow-md col-span-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">📊 Ora të punuara këtë javë sipas site-ve ({dashboardStats.thisWeek})</h3>
          <div className="flex gap-2">
            <select 
              value={chartType} 
              onChange={e => setChartType(e.target.value)}
              className="border p-1.5 rounded text-sm"
            >
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="area">Area Chart</option>
            </select>
          </div>
        </div>
        <div className="mb-4 text-sm font-semibold text-gray-700">
          Total orë të punuara: <span className="text-blue-600">{dashboardStats.totalWorkHours}</span> orë
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div>
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="hours"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="site" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="hours" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: "Orë", position: "insideBottomRight", offset: -5 }} />
                    <YAxis type="category" dataKey="site" width={150} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#3b82f6' }} />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={25} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 italic text-center py-8 text-sm">Nuk ka orë pune të regjistruara për këtë javë</p>
            )}
          </div>
          
          {/* Progress Bars */}
          <div>
            <h4 className="text-base font-semibold mb-3">Përparimi sipas site-ve</h4>
            {dashboardStats.workHoursBysite && dashboardStats.workHoursBysite.length > 0 ? (
              <SiteProgress 
                sites={activeSites}
                workHours={dashboardStats.workHoursBysite}
              />
            ) : (
              <p className="text-gray-500 italic text-sm">Nuk ka të dhëna për progresin</p>
            )}
          </div>
        </div>
      </div>

      {/* Top 5 më të paguar - Reduced font sizes */}
      <div className="bg-white p-6 rounded-xl shadow-md col-span-full">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🏅 Top 5 punonjësit më të paguar këtë javë</h3>
        {dashboardStats.top5Employees && dashboardStats.top5Employees.length > 0 ? (
          <ul className="space-y-2 text-gray-800">
            {dashboardStats.top5Employees.map((e, i) => (
              <li key={e.id} className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl shadow-md border border-blue-200">
                <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm border-2 border-blue-300 shadow">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {e.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {e.isPaid ? '✅ E paguar' : '⏳ E papaguar'}
                  </p>
                </div>
                <div className="text-blue-700 font-extrabold text-lg">£{e.grossAmount.toFixed(2)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic text-center py-8 text-sm">Nuk ka pagesa të regjistruara për këtë javë</p>
        )}
      </div>

      {/* Faturat e papaguara - Reduced font sizes */}
      <div className="bg-white p-6 rounded-xl shadow-md col-span-full">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📌 Faturat e Papaguara</h3>
        {unpaid.length === 0 ? (
          <p className="text-gray-500 italic text-sm">Të gjitha faturat janë të paguara ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-sm">
            {unpaid.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-3">
                <span className="font-bold">🔴 Kontrata #{item.contractNumber || ''}</span>
                <span className="font-bold text-black">Nr. Fature: <b>{item.invoiceNumber || ''}</b></span>
                <span className="font-bold text-black flex items-center gap-1">🏢 Site: <b>{item.siteName || ''}</b></span>
                <span className="font-bold text-base flex items-center gap-1">💷 {item.total !== undefined ? `£${item.total.toFixed(2)}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Shpenzimet e papaguara - Reduced font sizes */}
      <div className="bg-white p-6 rounded-xl shadow-md col-span-full mb-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📂 Shpenzimet e Papaguara</h3>
        {unpaidExpenses.length === 0 ? (
          <p className="text-gray-500 italic text-sm">Të gjitha shpenzimet janë të paguara ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-sm">
            {unpaidExpenses.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-3">
                <span className="font-bold flex items-center gap-1">📅 {item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
                <span className="font-bold text-base">{item.type || ''}</span>
                <span className="font-bold text-base flex items-center gap-1">💷 {item.gross !== undefined ? `£${item.gross.toFixed(2)}` : ''}</span>
                <span className="font-bold text-blue-700 flex items-center gap-1">🏢 {(() => {
                  if (!item.contract_id || !contracts.length) return '';
                  const c = contracts.find(c => String(c.id) === String(item.contract_id));
                  return c ? `${c.site_name || c.siteName || ''}` : '';
                })()}</span>
                <span className="text-gray-700 text-xs">{item.description || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Butoni Dil - Reduced font size */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold px-6 py-2 rounded-lg shadow-lg hover:from-pink-500 hover:to-red-500 transition text-sm"
        >
          🚪 Dil
        </button>
      </div>
    </div>
  );
}
