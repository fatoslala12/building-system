import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { DashboardSkeleton } from "../components/ui/Skeleton";
import NotificationCenter from "../components/ui/NotificationCenter";
import WeatherWidget from "../components/ui/WeatherWidget";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Container, Grid, Stack } from "../components/ui/Layout";
import { CountStatCard, MoneyStatCard } from "../components/ui/StatCard";
import { StatusBadge, PaymentBadge } from "../components/ui/Badge";
import EmptyState, { NoTasksEmpty } from "../components/ui/EmptyState";

// Debounce utility
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
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Debounced task filter
  const debouncedTaskFilter = useDebounce(taskFilter, 300);

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

  const filteredTasks = useMemo(() => 
    allTasks.filter(t => debouncedTaskFilter === 'all' ? true : t.status === debouncedTaskFilter),
    [allTasks, debouncedTaskFilter]
  );

  const taskStatsMemo = useMemo(() => ({
    totalTasks: allTasks.length,
    completedTasks: allTasks.filter(t => t.status === "completed").length,
    ongoingTasks: allTasks.filter(t => t.status === "ongoing").length
  }), [allTasks]);

  // Memoized user info
  const userInfo = useMemo(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      user,
      userFullName: (user?.first_name && user?.last_name)
        ? `${user.first_name} ${user.last_name}`
        : (user?.firstName && user?.lastName)
          ? `${user.firstName} ${user.lastName}`
          : ""
    };
  }, []);

  // Optimized data fetching with error boundaries
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try the new optimized API first, fallback to manual calculation if it fails
      let dashboardData = null;
      try {
        const dashboardRes = await api.get("/api/work-hours/dashboard-stats");
        dashboardData = snakeToCamel(dashboardRes.data || {});
        console.log('[DEBUG] Dashboard API success:', dashboardData);
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
      
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      {/* HEADER MODERN */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl shadow-lg px-10 py-6 mb-8 border-b-2 border-blue-200 animate-fade-in w-full">
        <div className="flex-shrink-0 bg-blue-100 rounded-xl p-3 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-12 h-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Mirë se erdhe{userInfo.userFullName ? `, ${userInfo.userFullName}` : ""}</h2>
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-1 drop-shadow">Paneli i Administrimit</div>
          <div className="text-lg font-medium text-purple-700">Statistika, detyra, pagesa dhe më shumë</div>
        </div>
        <div className="text-right text-sm text-gray-600 flex items-center gap-4">
          <div>
            <div>Përditësuar: {lastUpdated.toLocaleTimeString()}</div>
            <button 
              onClick={fetchData}
              className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition"
            >
              🔄 Rifresko
            </button>
          </div>
          <NotificationCenter />
        </div>
      </div>

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

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">⚡ Aksione të Shpejta</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-blue-500 text-white p-4 rounded-xl hover:bg-blue-600 transition flex flex-col items-center gap-2">
            <span className="text-2xl">👷</span>
            <span className="font-semibold">Shto Punonjës</span>
          </button>
          <button className="bg-green-500 text-white p-4 rounded-xl hover:bg-green-600 transition flex flex-col items-center gap-2">
            <span className="text-2xl">📋</span>
            <span className="font-semibold">Detyrë e Re</span>
          </button>
          <button className="bg-purple-500 text-white p-4 rounded-xl hover:bg-purple-600 transition flex flex-col items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="font-semibold">Pagesë</span>
          </button>
          <button className="bg-orange-500 text-white p-4 rounded-xl hover:bg-orange-600 transition flex flex-col items-center gap-2">
            <span className="text-2xl">📊</span>
            <span className="font-semibold">Raport</span>
          </button>
        </div>
      </div>

      {/* Detyrat - më të dukshme */}
      <div className="bg-gradient-to-r from-yellow-50 via-white to-green-50 p-8 rounded-2xl shadow-xl col-span-full border border-yellow-200">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📋 Detyrat</h3>
        <div className="mb-4 flex gap-4 items-center">
          <label className="font-medium">Filtro:</label>
          <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)} className="border p-2 rounded">
            <option value="ongoing">Vetëm aktive</option>
            <option value="completed">Vetëm të përfunduara</option>
            <option value="all">Të gjitha</option>
          </select>
        </div>
        <div className="mb-4 flex flex-wrap gap-6">
          <div className="bg-blue-100 px-6 py-3 rounded-xl text-blue-800 font-bold shadow">Totali: {taskStatsMemo.totalTasks}</div>
          <div className="bg-green-100 px-6 py-3 rounded-xl text-green-800 font-bold shadow">✅ Të përfunduara: {taskStatsMemo.completedTasks}</div>
          <div className="bg-yellow-100 px-6 py-3 rounded-xl text-yellow-800 font-bold shadow">🕒 Në vazhdim: {taskStatsMemo.ongoingTasks}</div>
        </div>
        {filteredTasks.length > 0 ? (
          <ul className="space-y-3">
            {filteredTasks.map((t, idx) => (
              <li key={t.id || idx} className="flex flex-col md:flex-row md:items-center gap-4 bg-white rounded-xl p-4 shadow border border-blue-100">
                <StatusBadge status={t.status === 'completed' ? 'completed' : 'ongoing'} />
                <span className="font-semibold flex-1 text-lg">{t.description || t.title || ''}</span>
                <span className="text-lg text-blue-700 font-bold">{t.site_name || t.siteName || ''}</span>
                <span className="text-lg text-purple-700 font-bold">Afati: {t.due_date ? new Date(t.due_date).toLocaleDateString() : ''}</span>
                <span className="text-xs text-gray-500">Nga: {t.assigned_by || t.assignedBy || ''}</span>
              </li>
            ))}
          </ul>
        ) : (
          <NoTasksEmpty />
        )}
      </div>

      {/* Grafik dhe Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Grafik për site */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-md">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📊 Ora të punuara këtë javë sipas site-ve ({dashboardStats.thisWeek})</h3>
          <div className="mb-4 text-lg font-semibold text-gray-700">
            Total orë të punuara: <span className="text-blue-600">{dashboardStats.totalWorkHours}</span> orë
          </div>
          {dashboardStats.workHoursBysite && dashboardStats.workHoursBysite.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dashboardStats.workHoursBysite} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" label={{ value: "Orë", position: "insideBottomRight", offset: -5 }} />
                <YAxis type="category" dataKey="site" width={200} tick={{ fontSize: 18, fontWeight: 'bold', fill: '#3b82f6' }} />
                <Tooltip />
                <Bar dataKey="hours" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 italic text-center py-8">Nuk ka orë pune të regjistruara për këtë javë</p>
          )}
        </div>

        {/* Weather Widget */}
        <div className="lg:col-span-1">
          <WeatherWidget siteName="London" />
        </div>
      </div>

      {/* Top 5 më të paguar */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">🏅 Top 5 punonjësit më të paguar këtë javë</h3>
        {dashboardStats.top5Employees && dashboardStats.top5Employees.length > 0 ? (
          <ul className="space-y-3 text-gray-800">
            {dashboardStats.top5Employees.map((e, i) => (
              <li key={e.id} className="flex items-center gap-6 bg-blue-50 p-5 rounded-2xl shadow-md border border-blue-200">
                <div className="w-14 h-14 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl border-2 border-blue-300 shadow">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">
                    {e.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {e.isPaid ? '✅ E paguar' : '⏳ E papaguar'}
                  </p>
                </div>
                <div className="text-blue-700 font-extrabold text-xl">£{e.grossAmount.toFixed(2)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic text-center py-8">Nuk ka pagesa të regjistruara për këtë javë</p>
        )}
      </div>

      {/* Faturat e papaguara */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📌 Faturat e Papaguara</h3>
        {unpaid.length === 0 ? (
          <p className="text-gray-500 italic">Të gjitha faturat janë të paguara ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {unpaid.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <span className="font-bold">🔴 Kontrata #{item.contractNumber || ''}</span>
                <span className="font-bold text-black">Nr. Fature: <b>{item.invoiceNumber || ''}</b></span>
                <span className="font-bold text-black flex items-center gap-1">🏢 Site: <b>{item.siteName || ''}</b></span>
                <span className="font-bold text-lg flex items-center gap-1">💷 {item.total !== undefined ? `£${item.total.toFixed(2)}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Shpenzimet e papaguara */}
      <div className="bg-white p-8 rounded-2xl shadow-md col-span-full mb-8">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">📂 Shpenzimet e Papaguara</h3>
        {unpaidExpenses.length === 0 ? (
          <p className="text-gray-500 italic">Të gjitha shpenzimet janë të paguara ✅</p>
        ) : (
          <ul className="space-y-2 text-red-700 text-base">
            {unpaidExpenses.map((item, idx) => (
              <li key={idx} className="bg-red-50 p-3 rounded shadow-sm border border-red-200 flex items-center gap-4">
                <span className="font-bold flex items-center gap-1">📅 {item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
                <span className="font-bold text-lg">{item.type || ''}</span>
                <span className="font-bold text-lg flex items-center gap-1">💷 {item.gross !== undefined ? `£${item.gross.toFixed(2)}` : ''}</span>
                <span className="font-bold text-blue-700 flex items-center gap-1">🏢 {(() => {
                  if (!item.contract_id || !contracts.length) return '';
                  const c = contracts.find(c => String(c.id) === String(item.contract_id));
                  return c ? `${c.site_name || c.siteName || ''}` : '';
                })()}</span>
                <span className="text-gray-700">{item.description || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Butoni Dil */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:from-pink-500 hover:to-red-500 transition text-lg"
        >
          🚪 Dil
        </button>
      </div>
    </div>
  );
}
