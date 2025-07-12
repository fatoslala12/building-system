import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import WorkHoursTable from "../components/WorkHoursTable";
import { useWorkHours } from "../hooks/useWorkHours";
import { useAutoSave } from "../hooks/useAutoSave";
import WorkHoursSkeleton from "../components/ui/WorkHoursSkeleton";
import { CountStatCard, MoneyStatCard } from "../components/ui/StatCard";
import { Grid } from "../components/ui/Layout";
import { FiSave, FiAlertCircle, FiCheckCircle } from "react-icons/fi";

export default function WorkHours() {
  const { user, setUser } = useAuth();
  const isManager = user?.role === "manager";
  const isAdmin = user?.role === "admin";
  const token = localStorage.getItem("token");

  const [saved, setSaved] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState([]);
  const [showAutoSaveStatus, setShowAutoSaveStatus] = useState(false);

  // Use custom hook for work hours logic
  const {
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
  } = useWorkHours(user, token);

  // Auto-save functionality
  const { isSaving, lastSaved, error: autoSaveError, manualSave } = useAutoSave(
    hourData,
    async (data) => {
      if (isManager) {
        await handleSubmit();
      }
    },
    {
      enabled: isManager,
      delay: 3000, // 3 seconds
      onSaveStart: () => {
        setShowAutoSaveStatus(true);
      },
      onSaveSuccess: () => {
        setSaved(true);
        setTimeout(() => setShowAutoSaveStatus(false), 3000);
      },
      onSaveError: () => {
        setTimeout(() => setShowAutoSaveStatus(false), 5000);
      }
    }
  );

  // Update user workplace for manager
  useEffect(() => {
    if (user && user.role === "manager" && !user.workplace && user.employee_id) {
      fetch(`https://building-system.onrender.com/api/employees/${user.employee_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.workplace) {
            setUser(prev => ({ 
              ...prev, 
              workplace: Array.isArray(data.workplace) ? data.workplace : [data.workplace] 
            }));
          }
        })
        .catch(console.error);
    }
  }, [user, token, setUser]);

  // Set only the current week expanded by default for admin
  useEffect(() => {
    if (isAdmin) {
      setExpandedWeeks([]);
    }
  }, [isAdmin, currentWeekInfo.currentWeekLabel]);

  const toggleWeek = (weekLabel) => {
    setExpandedWeeks((prev) => {
      if (prev.includes(weekLabel)) {
        return [];
      }
      return [weekLabel];
    });
  };

  // Generate existing weeks from hourData
  const allWeekLabels = new Set();
  employees.forEach(emp => {
    const empData = hourData[emp.id] || {};
    Object.keys(empData)
      .filter(label => label.includes(" - "))
      .forEach(label => allWeekLabels.add(label));
  });

  allWeekLabels.add(currentWeekInfo.currentWeekLabel);

  const sortedWeeks = Array.from(allWeekLabels).sort((a, b) => {
    const [aStart] = a.split(" - ");
    const [bStart] = b.split(" - ");
    return new Date(bStart) - new Date(aStart);
  });

  const today = new Date();
  const otherWeeks = sortedWeeks.filter(weekLabel => {
    if (weekLabel === currentWeekInfo.currentWeekLabel) return false;
    const [weekStart] = weekLabel.split(' - ');
    const weekStartDate = new Date(weekStart);
    return weekStartDate <= today;
  });

  if (loading) {
    return <WorkHoursSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Gabim në ngarkim</h2>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Rifresko
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 p-6">
      {/* Auto-save Status */}
      {showAutoSaveStatus && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 ${
          isSaving ? 'bg-yellow-100 text-yellow-800' : 
          autoSaveError ? 'bg-red-100 text-red-800' : 
          'bg-green-100 text-green-800'
        }`}>
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
              <span>Duke ruajtur...</span>
            </>
          ) : autoSaveError ? (
            <>
              <FiAlertCircle className="w-4 h-4" />
              <span>Gabim në ruajtje</span>
            </>
          ) : (
            <>
              <FiCheckCircle className="w-4 h-4" />
              <span>U ruajt automatikisht</span>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-gray-800">
          {isManager ? "🕒 Plotëso Orët për Javën" : "📋 Pagesat e Marra"}
        </h2>
        <p className="text-lg text-gray-600">
          {user?.firstName} {user?.lastName} - {currentWeekInfo.currentWeekLabel}
        </p>
        {lastSaved && (
          <p className="text-sm text-gray-500 mt-2">
            Përditësuar: {lastSaved.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <Grid cols={{ xs: 1, sm: 2, lg: 4 }} gap="lg" className="mb-8">
        <CountStatCard
          title="Punonjës"
          count={employees.length}
          icon="👷"
          color="blue"
        />
        <CountStatCard
          title="Orë Totale"
          count={weekStats.totalHours}
          icon="⏱"
          color="green"
        />
        <MoneyStatCard
          title="Total Bruto"
          amount={weekStats.totalBruto}
          color="purple"
        />
        <MoneyStatCard
          title="Total Neto"
          amount={weekStats.totalNeto}
          color="amber"
        />
      </Grid>

      {/* Manager Messages */}
      {isManager && employees.length === 0 && (
        <div className="bg-yellow-100 text-yellow-800 p-6 rounded-2xl text-center font-semibold mb-6 shadow-lg">
          <p className="text-lg mb-2">Nuk keni asnjë punonjës aktiv të caktuar në site-t tuaj.</p>
          {!user.employee_id ? (
            <div className="mt-4 text-blue-600">
              <p>Po përpiqem të gjej punonjësin tuaj në sistem...</p>
            </div>
          ) : (
            <div className="mt-4 text-red-600">
              <p>Nuk jeni të regjistruar si punonjës në sistem. Kontaktoni administratorin.</p>
            </div>
          )}
        </div>
      )}

      {isManager && employees.length > 0 && (
        <div className="bg-green-100 text-green-800 p-4 rounded-2xl text-center mb-6 shadow-lg">
          <p className="text-lg font-semibold">
            ✅ U gjetën {employees.length} punonjës që mund të menaxhoni orët e tyre.
          </p>
        </div>
      )}

      {/* User/Manager Paid Hours Display */}
      {["user", "manager"].includes(user?.role) && (
        <div className="mt-8 bg-white p-6 rounded-2xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-center">
            🧾 Orët e Mia të Pagura – {currentWeekInfo.currentWeekLabel}
          </h3>
          {(() => {
            const myKey = `${currentWeekInfo.currentWeekLabel}_${user.id}`;
            const isPaid = paidStatus[myKey];
            const userHours = hourData[user.id] || {};
            const thisWeek = userHours[currentWeekInfo.currentWeekLabel] || {};

            if (!isPaid) {
              return (
                <div className="text-center py-8">
                  <FiAlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 italic">Orët për këtë javë nuk janë paguar ende.</p>
                </div>
              );
            }

            const entries = Object.entries(thisWeek).filter(([key]) => key !== "hourlyRate");
            if (entries.length === 0) {
              return (
                <div className="text-center py-8">
                  <p className="text-gray-500 italic">Nuk ka të dhëna për këtë javë.</p>
                </div>
              );
            }

            const rate = Number(thisWeek.hourlyRate || user.hourlyRate || 0);
            const labelType = user?.labelType || "UTR";

            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border mt-4 shadow rounded-lg overflow-hidden">
                    <thead className="bg-blue-50 text-gray-800 font-semibold">
                      <tr>
                        <th className="p-3 border">📅 Dita</th>
                        <th className="p-3 border">📍 Vendi</th>
                        <th className="p-3 border">⏱ Orë</th>
                        <th className="p-3 border">💷 Bruto</th>
                        <th className="p-3 border">💰 Neto</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {entries.map(([day, entry]) => {
                        const hours = Number(entry.hours || 0);
                        const bruto = hours * rate;
                        const neto = bruto * (labelType === "UTR" ? 0.8 : 0.7);

                        return (
                          <tr key={day} className="hover:bg-gray-50 text-center">
                            <td className="p-3 border">{day}</td>
                            <td className="p-3 border">{entry.site || "-"}</td>
                            <td className="p-3 border">{hours}</td>
                            <td className="p-3 border text-green-700 font-semibold">£{bruto.toFixed(2)}</td>
                            <td className="p-3 border text-blue-700 font-semibold">£{neto.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-gray-100 rounded-xl text-sm text-gray-800 shadow-inner text-center">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="font-bold text-gray-600">🔢 Total orë</p>
                      <p className="text-xl font-bold text-blue-600">
                        {entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0)}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-600">💷 Total bruto</p>
                      <p className="text-xl font-bold text-green-600">
                        £{(entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0) * rate).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-600">💰 Total neto</p>
                      <p className="text-xl font-bold text-purple-600">
                        £{(entries.reduce((acc, [_, entry]) => acc + Number(entry.hours || 0), 0) * rate * (labelType === "UTR" ? 0.8 : 0.7)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Manager Work Hours Form */}
      {isManager && (
        <div className="mt-8">
          <form onSubmit={(e) => { e.preventDefault(); manualSave(); }}>
            <WorkHoursTable
              employees={employees}
              weekLabel={currentWeekInfo.currentWeekLabel}
              data={hourData}
              onChange={handleChange}
              readOnly={false}
              showPaymentControl={isAdmin}
              siteOptions={siteOptions}
            />
            <div className="flex justify-center gap-4 mt-6">
              <button 
                type="submit" 
                disabled={isSaving}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-lg"
              >
                <FiSave className="w-5 h-5" />
                {isSaving ? 'Duke ruajtur...' : '💾 Ruaj Orët e Kësaj Jave'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Week Display */}
      {(saved || isAdmin) && (
        <div className="mt-12">
          <h3 className="text-2xl font-bold mb-6 text-center">
            📊 Java Aktuale - {currentWeekInfo.currentWeekLabel}
          </h3>
          <WorkHoursTable
            employees={employees}
            weekLabel={currentWeekInfo.currentWeekLabel}
            data={hourData}
            onChange={handleChange}
            readOnly={true}
            showPaymentControl={isAdmin}
            siteOptions={siteOptions}
          />
        </div>
      )}

      {/* Other Weeks (Admin Only) */}
      {isAdmin && otherWeeks.map((weekLabel) => (
        <div key={weekLabel} className="mt-8">
          <button 
            className="text-blue-600 underline mb-4 text-lg font-semibold hover:text-blue-800 transition" 
            onClick={() => toggleWeek(weekLabel)}
          >
            {expandedWeeks.includes(weekLabel) ? "▼ Fshih" : "▶ Shfaq"} {weekLabel}
          </button>
          {expandedWeeks.includes(weekLabel) && (
            <WorkHoursTable
              employees={employees}
              weekLabel={weekLabel}
              data={hourData}
              onChange={handleChange}
              readOnly={true}
              showPaymentControl={isAdmin}
              siteOptions={siteOptions}
            />
          )}
        </div>
      ))}
    </div>
  );
}