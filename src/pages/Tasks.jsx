import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import axios from "axios";

export default function Tasks() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    description: "",
    assignedTo: "",
    siteName: "",
    dueDate: ""
  });
  const token = localStorage.getItem("token");

  // Merr të dhënat nga backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [employeesRes, contractsRes, tasksRes] = await Promise.all([
          axios.get("https://building-system.onrender.com/api/employees", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get("https://building-system.onrender.com/api/contracts", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get("https://building-system.onrender.com/api/tasks", {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setEmployees(employeesRes.data || []);
        setContracts(contractsRes.data || []);
        setTasks(tasksRes.data || []);
        
      } catch (error) {
        console.error("Error fetching tasks data:", error);
        setEmployees([]);
        setContracts([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [token]);

  // Filtro site-t sipas workplace të punonjësit të zgjedhur
  const selectedEmployee = employees.find(e => String(e.id) === String(newTask.assignedTo));
  const filteredSites = selectedEmployee && Array.isArray(selectedEmployee.workplace)
    ? selectedEmployee.workplace
    : contracts.map(c => c.site_name);

  const handleChange = (e) => {
    setNewTask({ ...newTask, [e.target.name]: e.target.value });
  };

  // Funksion për të kthyer camelCase në snake_case për payload-in e detyrës
  function toSnakeCaseTask(obj) {
    return {
      assigned_to: obj.assignedTo,
      title: obj.description,
      description: obj.description,
      status: obj.status || 'ongoing',
      site_name: obj.siteName || null,
      due_date: obj.dueDate || null,
      assigned_by: obj.assignedBy || obj.assigned_by || null
    };
  }

  const handleAssign = async () => {
    const now = new Date().toISOString();
    let receivers = [];

    if (newTask.assignedTo) {
      receivers = [newTask.assignedTo];
    } else if (newTask.siteName) {
      receivers = employees
        .filter((e) => Array.isArray(e.workplace) && e.workplace.includes(newTask.siteName))
        .map((e) => e.id);
    }

    if (!newTask.description.trim() || receivers.length === 0) {
      alert("Plotëso përshkrimin dhe zgjidh marrësit.");
      return;
    }

    try {
      const newEntries = await Promise.all(receivers.map(async (id) => {
        const entry = toSnakeCaseTask({
          assignedTo: parseInt(id, 10),
          description: newTask.description,
          status: "ongoing",
          siteName: newTask.siteName || null,
          dueDate: newTask.dueDate || null,
          assignedBy: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email
        });
        console.log('[DEBUG] Task payload:', entry);
        const res = await axios.post("https://building-system.onrender.com/api/tasks", entry, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
      }));
      setTasks((prev) => [...prev, ...newEntries]);
      setNewTask({ description: "", assignedTo: "", siteName: "", dueDate: "" });
    } catch {
      alert("Gabim gjatë caktimit të detyrës!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Fshi këtë detyrë?")) return;
    try {
      await axios.delete(`https://building-system.onrender.com/api/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("Gabim gjatë fshirjes së detyrës!");
    }
  };

  // Funksion për të ndryshuar statusin e detyrës
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await axios.put(`https://building-system.onrender.com/api/tasks/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    } catch {
      alert("Gabim gjatë ndryshimit të statusit të detyrës!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Duke ngarkuar detyrat...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold mb-4">📝 Menaxho Detyrat</h2>

      {/* Shto Detyrë */}
      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold">➕ Krijo Detyrë të Re</h3>

        <input
          type="text"
          name="description"
          placeholder="Përshkrimi i detyrës"
          value={newTask.description}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">📧 Zgjidh personin</label>
            <select
              name="assignedTo"
              value={newTask.assignedTo}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            >
              <option value="">-- Asnjë --</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name} ({e.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">🏗 Ose zgjidh site</label>
            <select
              name="siteName"
              value={newTask.siteName}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            >
              <option value="">-- Asnjë --</option>
              {filteredSites.map((site) => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">📅 Afati</label>
            <input
              type="date"
              name="dueDate"
              value={newTask.dueDate}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>

        <button
          onClick={handleAssign}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
        >
          📤 Cakto Detyrën
        </button>
      </div>

      {/* Lista e Detyrave */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Lista e Detyrave</h3>
        {tasks.length === 0 ? (
          <p className="italic text-gray-500">Nuk ka asnjë detyrë të regjistruar.</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Statusi</th>
                <th className="p-2 border">Përshkrimi</th>
                <th className="p-2 border">Për</th>
                <th className="p-2 border">Site</th>
                <th className="p-2 border">Afati</th>
                <th className="p-2 border">Nga</th>
                <th className="p-2 border">Data</th>
                <th className="p-2 border">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="text-center">
                  <td className={`p-2 border font-semibold ${t.status === "ongoing" ? "text-yellow-600" : "text-green-600"}`}>
                    {t.status === "ongoing" ? "Në vazhdim" : "Përfunduar"}
                    {t.status === "ongoing" && (
                      <button
                        onClick={() => handleStatusChange(t.id, "completed")}
                        className="ml-2 px-2 py-1 bg-green-200 text-green-800 rounded text-xs hover:bg-green-400"
                      >
                        ✅ Përfundo
                      </button>
                    )}
                  </td>
                  <td className="p-2 border">{t.description}</td>
                  <td className="p-2 border">{t.first_name ? `${t.first_name} ${t.last_name}` : t.assigned_to}</td>
                  {/* Nëse nuk ka emër, kërko nga employees */}
                  {!t.first_name && employees.length > 0 && (
                    (() => {
                      const emp = employees.find(e => String(e.id) === String(t.assigned_to));
                      return emp ? `${emp.first_name} ${emp.last_name}` : t.assigned_to;
                    })()
                  )}
                  <td className="p-2 border">{t.site_name || "-"}</td>
                  <td className="p-2 border">{t.due_date ? format(new Date(t.due_date), "dd/MM/yyyy") : "-"}</td>
                  <td className="p-2 border">{t.assigned_by || "-"}</td>
                  <td className="p-2 border">
                    {t.created_at ? format(new Date(t.created_at), "dd/MM/yyyy") : "-"}
                  </td>
                  <td className="p-2 border">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      🗑 Fshi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}