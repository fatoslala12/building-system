import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';

export const useWorkHours = (user, token) => {
  const [employees, setEmployees] = useState([]);
  const [hourData, setHourData] = useState({});
  const [siteOptions, setSiteOptions] = useState([]);
  const [paidStatus, setPaidStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isManager = user?.role === "manager";
  const isAdmin = user?.role === "admin";

  // Memoized current week calculation
  const currentWeekInfo = useMemo(() => {
    const getStartOfWeek = (offset = 0) => {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
      return new Date(today.setDate(diff));
    };

    const formatDateRange = (startDate) => {
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);
      return `${startStr} - ${endStr}`;
    };

    const currentWeekStart = getStartOfWeek();
    const currentWeekLabel = formatDateRange(currentWeekStart);

    return { currentWeekStart, currentWeekLabel };
  }, []);

  // Optimized employee fetching
  const fetchEmployees = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await api.get("/api/employees", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const emps = res.data || [];
      
      if (isAdmin) {
        setEmployees(emps);
        return;
      }
      
      if (isManager) {
        // Manager logic - filter employees by shared contracts
        if (!user.employee_id) {
          // Try to find employee by email
          const selfEmployee = emps.find(emp => 
            emp.email && emp.email.toLowerCase() === user.email.toLowerCase()
          );
          
          if (selfEmployee) {
            setEmployees([selfEmployee]);
            return;
          }
          
          // Try to get employee_id from user record
          const userRes = await api.get(`/api/users/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (userRes.data?.employee_id) {
            const linkedEmployee = emps.find(emp => 
              String(emp.id) === String(userRes.data.employee_id)
            );
            if (linkedEmployee) {
              setEmployees([linkedEmployee]);
              return;
            }
          }
          
          setEmployees([]);
          return;
        }
        
        // Get employee workplaces
        const ewRes = await api.get("/api/employee-workplaces", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const allRelations = ewRes.data || [];
        const myContractIds = allRelations
          .filter(r => String(r.employee_id) === String(user.employee_id))
          .map(r => r.contract_id);
        
        if (myContractIds.length === 0) {
          const selfEmployee = emps.find(emp => 
            String(emp.id) === String(user.employee_id)
          );
          setEmployees(selfEmployee ? [selfEmployee] : []);
          return;
        }
        
        const filteredEmps = emps.filter(emp => {
          if (String(emp.id) === String(user.employee_id)) return true;
          const empContracts = allRelations
            .filter(r => String(r.employee_id) === String(emp.id))
            .map(r => r.contract_id);
          return empContracts.some(cid => myContractIds.includes(cid));
        });
        
        setEmployees(filteredEmps);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("Gabim në marrjen e punonjësve");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [user, token, isAdmin, isManager]);

  // Optimized work hours fetching
  const fetchWorkHours = useCallback(async () => {
    if (employees.length === 0) return;
    
    try {
      const res = await api.get("/api/work-hours/structured", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHourData(res.data || {});
    } catch (err) {
      console.error("Error fetching work hours:", err);
      setHourData({});
    }
  }, [employees, token]);

  // Optimized site options fetching
  const fetchSiteOptions = useCallback(async () => {
    try {
      const res = await api.get("/api/contracts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sites = (res.data || []).map(c => c.siteName).filter(Boolean);
      setSiteOptions(sites);
    } catch (err) {
      console.error("Error fetching site options:", err);
      setSiteOptions([]);
    }
  }, [token]);

  // Optimized paid status fetching
  const fetchPaidStatus = useCallback(async () => {
    try {
      const res = await api.get(`/api/work-hours/paid-status`, {
        params: { week: currentWeekInfo.currentWeekLabel },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = {};
      (res.data || []).forEach(row => {
        data[`${row.week}_${row.employeeId}`] = row.paid;
      });
      setPaidStatus(data);
    } catch (err) {
      console.error("Error fetching paid status:", err);
      setPaidStatus({});
    }
  }, [currentWeekInfo.currentWeekLabel, token]);

  // Debounced change handler
  const handleChange = useCallback((empId, day, field, value) => {
    setHourData((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [currentWeekInfo.currentWeekLabel]: {
          ...prev[empId]?.[currentWeekInfo.currentWeekLabel],
          [day]: {
            ...prev[empId]?.[currentWeekInfo.currentWeekLabel]?.[day],
            [field]: value
          }
        }
      }
    }));
  }, [currentWeekInfo.currentWeekLabel]);

  // Optimized submit handler
  const handleSubmit = useCallback(async () => {
    const days = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"];
    
    // Validation
    for (const empId of Object.keys(hourData)) {
      const weekData = hourData[empId]?.[currentWeekInfo.currentWeekLabel] || {};
      for (const day of days) {
        const entry = weekData[day];
        if (entry && entry.hours && (!entry.site || entry.site === "")) {
          throw new Error(`Zgjidh vendin për çdo ditë me orë për punonjësin ID: ${empId}, dita: ${day}`);
        }
      }
    }
    
    try {
      await api.post("/api/work-hours", {
        hourData,
        weekLabel: currentWeekInfo.currentWeekLabel
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh data
      await fetchWorkHours();
      return true;
    } catch (err) {
      console.error("Error saving work hours:", err);
      throw err;
    }
  }, [hourData, currentWeekInfo.currentWeekLabel, token, fetchWorkHours]);

  // Memoized calculations
  const weekStats = useMemo(() => {
    let totalHours = 0;
    let totalBruto = 0;
    let totalTVSH = 0;
    let totalNeto = 0;

    employees.forEach(emp => {
      const empData = hourData[emp.id]?.[currentWeekInfo.currentWeekLabel] || {};
      const empRate = Number(emp.hourlyRate || emp.hourly_rate || 0);
      const empLabelType = emp.labelType || emp.label_type || "UTR";
      
      Object.values(empData).forEach(entry => {
        if (entry && entry.hours) {
          const hours = Number(entry.hours);
          totalHours += hours;
          totalBruto += hours * empRate;
          totalTVSH += empLabelType === "UTR" ? hours * empRate * 0.2 : hours * empRate * 0.3;
          totalNeto += empLabelType === "UTR" ? hours * empRate * 0.8 : hours * empRate * 0.7;
        }
      });
    });

    return { totalHours, totalBruto, totalTVSH, totalNeto };
  }, [employees, hourData, currentWeekInfo.currentWeekLabel]);

  // Effects
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchWorkHours();
  }, [fetchWorkHours]);

  useEffect(() => {
    fetchSiteOptions();
  }, [fetchSiteOptions]);

  useEffect(() => {
    fetchPaidStatus();
  }, [fetchPaidStatus]);

  return {
    employees,
    hourData,
    siteOptions,
    paidStatus,
    loading,
    error,
    currentWeekInfo,
    handleChange,
    handleSubmit,
    weekStats,
    fetchWorkHours,
    fetchPaidStatus
  };
};