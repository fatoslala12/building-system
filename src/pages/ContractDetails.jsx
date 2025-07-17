import { useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import html2pdf from "html2pdf.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ContractDetails() {
  const { contract_number } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [newInvoice, setNewInvoice] = useState({
    items: [{ description: "", shifts: "", rate: "", amount: 0 }],
    other: 0,
    paid: false,
    date: new Date().toISOString().split("T")[0],
    description: "",
    invoice_number: "",
    shifts: "",
    rate: "",
    total: 0,
    total_net: 0,
    vat: 0,
    created_by: "",
    status: "Draft",
    notes: "",
    actions: []
  });
  
  // Search and filter states
  const [workHoursSearch, setWorkHoursSearch] = useState("");
  const [workHoursFilter, setWorkHoursFilter] = useState("all"); // all, NI, UTR
  const [invoicesSearch, setInvoicesSearch] = useState("");
  const [invoicesFilter, setInvoicesFilter] = useState("all"); // all, paid, unpaid
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    documentUpload: false,
    documentDelete: false,
    addComment: false,
    saveInvoice: false,
    deleteInvoice: {},
    togglePaid: {},
    exportPDF: false,
    sendEmail: {}
  });
  
  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null
  });
  
  const [showAddModal, setShowAddModal] = useState(false);
  
  const token = localStorage.getItem("token");

  // Confirmation dialog functions
  const showConfirmDialog = useCallback((title, message, onConfirm, onCancel = null) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm: () => {
        setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
        onConfirm();
      },
      onCancel: () => {
        setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
        if (onCancel) onCancel();
      }
    });
  }, []);

  const hideConfirmDialog = useCallback(() => {
    setConfirmDialog({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
  }, []);

  // Modal functions
  const openAddModal = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
  }, []);

  // Merr kontratën, faturat dhe orët e punës nga backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const contractRes = await axios.get(
          `https://building-system.onrender.com/api/contracts/contract-number/${contract_number}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setContract(contractRes.data);

        const invoicesRes = await axios.get(
          `https://building-system.onrender.com/api/invoices/${contract_number}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setInvoices(invoicesRes.data || []);

        // Merr orët e punës për këtë kontratë
        const workHoursRes = await axios.get(
          `https://building-system.onrender.com/api/work-hours/contract/${contract_number}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('🔍 Work hours data:', workHoursRes.data);
        setWorkHours(workHoursRes.data || []);

        // Merr listën e punonjësve për të marrë labelType (NI/UTR)
        const employeesRes = await axios.get(
          `https://building-system.onrender.com/api/employees`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEmployees(employeesRes.data || []);
        
      } catch (error) {
        console.error("Error fetching contract data:", error);
        setContract(null);
        setInvoices([]);
        setWorkHours([]);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [contract_number, token]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showAddModal) {
        closeAddModal();
      }
    };

    if (showAddModal) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal]);

  // Ngarko dokument PDF
  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoadingStates(prev => ({ ...prev, documentUpload: true }));
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const newDoc = { name: file.name, content: reader.result };
      try {
        const res = await axios.put(
          `https://building-system.onrender.com/api/contracts/${contract.id}/documents`,
          { document: newDoc },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setContract(res.data);
      } catch {
        alert("Gabim gjatë ngarkimit të dokumentit!");
      } finally {
        setLoadingStates(prev => ({ ...prev, documentUpload: false }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Fshi dokument
  const handleDocumentDelete = async (index) => {
    const document = contract.documents[index];
    
    showConfirmDialog(
      "Fshi Dokumentin",
      `Jeni i sigurt që doni të fshini dokumentin "${document.name}"?`,
      async () => {
        setLoadingStates(prev => ({ ...prev, documentDelete: true }));
        
        try {
          const res = await axios.delete(
            `https://building-system.onrender.com/api/contracts/${contract.id}/documents/${index}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setContract(res.data);
        } catch {
          alert("Gabim gjatë fshirjes së dokumentit!");
        } finally {
          setLoadingStates(prev => ({ ...prev, documentDelete: false }));
        }
      }
    );
  };

  // Shto koment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setLoadingStates(prev => ({ ...prev, addComment: true }));
    
    try {
      const res = await axios.post(
        `https://building-system.onrender.com/api/contracts/${contract.id}/comments`,
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContract(res.data);
      setNewComment("");
    } catch {
      alert("Gabim gjatë shtimit të komentit!");
    } finally {
      setLoadingStates(prev => ({ ...prev, addComment: false }));
    }
  };

  // Chart data
  const getProgressChartData = () => {
    const start = new Date(contract?.start_date);
    const end = new Date(contract?.finish_date);
    const today = new Date();
    const totalDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, Math.min((today - start) / (1000 * 60 * 60 * 24), totalDays));

    return [
      { name: "Fillimi", progress: 0 },
      { name: "Tani", progress: Math.floor((elapsedDays / totalDays) * 100) },
      { name: "Përfundimi", progress: 100 }
    ];
  };

  // Faturat
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index][field] = value;
    if (field === "shifts" || field === "rate") {
      const shifts = parseFloat(updatedItems[index].shifts || 0);
      const rate = parseFloat(updatedItems[index].rate || 0);
      updatedItems[index].amount = shifts * rate;
    }
    setNewInvoice((prev) => ({ ...prev, items: updatedItems }));
  };

  const handleAddItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: "", shifts: "", rate: "", amount: 0 }],
    });
  };

  // Ruaj faturë në backend
  const handleSaveInvoice = async () => {
    setLoadingStates(prev => ({ ...prev, saveInvoice: true }));
    
    // Gjej numrin e radhës për faturën e re
    const invoiceCount = invoices.length + 1;
    const invoice_number = `${contract.site_name} - #${invoiceCount}`;

    const firstItem = newInvoice.items && newInvoice.items.length > 0 ? newInvoice.items[0] : {};
    const itemsTotal = (newInvoice.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const total = Number(itemsTotal) + Number(newInvoice.other || 0);
    const vat = 0.2 * total;
    const total_net = total - vat;

    const newInvoiceWithContract = {
      contract_number: contract.contract_number,
      invoice_number, // përdor automatikisht të gjeneruarin
      date: newInvoice.date || "",
      description: newInvoice.description || "",
      shifts: firstItem.shifts || 0,
      rate: firstItem.rate || 0,
      total,
      total_net,
      vat,
      other: newInvoice.other || 0,
      created_by: "admin@demo.com",
      paid: newInvoice.paid || false,
      actions: newInvoice.actions || [],
      items: newInvoice.items || [],
      status: newInvoice.status || "Draft",
      notes: newInvoice.notes || ""
    };
    try {
      await axios.post(
        `https://building-system.onrender.com/api/invoices/${contract.contract_number}`,
        newInvoiceWithContract,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh invoices after saving
      const invoicesRes = await axios.get(
        `https://building-system.onrender.com/api/invoices/${contract.contract_number}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInvoices(invoicesRes.data || []);
      
      // Reset form
      setNewInvoice({
        items: [{ description: "", shifts: "", rate: "", amount: 0 }],
        other: 0,
        paid: false,
        date: new Date().toISOString().split("T")[0],
        description: "",
        invoice_number: "",
        shifts: "",
        rate: "",
        total: 0,
        total_net: 0,
        vat: 0,
        created_by: "",
        status: "Draft",
        notes: "",
        actions: []
      });
      
      alert("Fatura u ruajt me sukses!");
      closeAddModal();
    } catch (err) {
      console.error("Error saving invoice:", err);
      alert("Gabim gjatë ruajtjes së faturës!");
    } finally {
      setLoadingStates(prev => ({ ...prev, saveInvoice: false }));
    }
  };

  // Fshi faturë nga backend
  const handleDeleteInvoice = async (invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    
    showConfirmDialog(
      "Fshi Faturën",
      `Jeni i sigurt që doni të fshini faturën "${invoice?.invoice_number}"?`,
      async () => {
        setLoadingStates(prev => ({ ...prev, deleteInvoice: { ...prev.deleteInvoice, [invoiceId]: true } }));
        
        try {
          await axios.delete(
            `https://building-system.onrender.com/api/invoices/${invoiceId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          // Rifresko faturat pas fshirjes
          const invoicesRes = await axios.get(
            `https://building-system.onrender.com/api/invoices/${contract.contract_number}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setInvoices(invoicesRes.data || []);
        } catch {
          alert("Gabim gjatë fshirjes së faturës!");
        } finally {
          setLoadingStates(prev => ({ ...prev, deleteInvoice: { ...prev.deleteInvoice, [invoiceId]: false } }));
        }
      }
    );
  };

  // Toggle paid status
  const handleTogglePaid = async (invoiceId, currentPaid) => {
    setLoadingStates(prev => ({ ...prev, togglePaid: { ...prev.togglePaid, [invoiceId]: true } }));
    
    try {
      await axios.put(
        `https://building-system.onrender.com/api/invoices/${invoiceId}/toggle-paid`,
        { paid: !currentPaid },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh invoices after toggle
      const invoicesRes = await axios.get(
        `https://building-system.onrender.com/api/invoices/${contract.contract_number}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInvoices(invoicesRes.data || []);
    } catch {
      alert("Gabim gjatë ndryshimit të statusit të pagesës!");
    } finally {
      setLoadingStates(prev => ({ ...prev, togglePaid: { ...prev.togglePaid, [invoiceId]: false } }));
    }
  };

  // Dërgo faturë në email
  const handleSendEmail = async (invoiceId) => {
    setLoadingStates(prev => ({ ...prev, sendEmail: { ...prev.sendEmail, [invoiceId]: true } }));
    
    try {
      const response = await axios.post(
        `https://building-system.onrender.com/api/invoices/${invoiceId}/send-email`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert("✅ Fatura u dërgua me sukses në email!");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Gabim gjatë dërgimit të email-it!";
      alert(`❌ ${errorMessage}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, sendEmail: { ...prev.sendEmail, [invoiceId]: false } }));
    }
  };

  const exportToPDF = () => {
    const element = document.getElementById("invoice-area");
    const opt = {
      margin: 0,
      filename: `Fature_${contract.contract_number}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: "#ffffff" },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };
    html2pdf().set(opt).from(element).save();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Duke ngarkuar detajet e kontratës...</h2>
        </div>
      </div>
    );
  }

  if (!contract || Object.keys(contract).length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Kontrata nuk u gjet</h2>
          <button 
            onClick={() => navigate('/admin/contracts')} 
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            🔙 Kthehu tek Kontratat
          </button>
        </div>
      </div>
    );
  }

  // Funksion për të formatuar datat në format të lexueshëm
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const netTotal = newInvoice.items.reduce((acc, i) => acc + (i.amount || 0), 0);
  const vat = netTotal * 0.2;
  const grandTotal = netTotal + parseFloat(newInvoice.other || 0) + vat;

  // Filtered work hours based on search and filter
  const filteredWorkHours = workHours.filter(wh => {
    const employee = employees.find(emp => emp.id === wh.employee_id);
    const labelType = employee?.labelType || employee?.label_type || 'NI';
    const employeeName = wh.employee_name || `Employee #${wh.employee_id}`;
    const date = new Date(wh.date).toLocaleDateString('sq-AL');
    
    const matchesSearch = workHoursSearch === "" || 
      employeeName.toLowerCase().includes(workHoursSearch.toLowerCase()) ||
      date.includes(workHoursSearch);
    
    const matchesFilter = workHoursFilter === "all" || labelType === workHoursFilter;
    
    return matchesSearch && matchesFilter;
  });

  // Filtered invoices based on search and filter
  const filteredInvoices = invoices.filter(inv => {
    const invoiceNumber = inv.invoice_number || "";
    const description = inv.description || "";
    const date = formatDate(inv.date);
    
    const matchesSearch = invoicesSearch === "" || 
      invoiceNumber.toLowerCase().includes(invoicesSearch.toLowerCase()) ||
      description.toLowerCase().includes(invoicesSearch.toLowerCase()) ||
      date.includes(invoicesSearch);
    
    const matchesFilter = invoicesFilter === "all" || 
      (invoicesFilter === "paid" && inv.paid) ||
      (invoicesFilter === "unpaid" && !inv.paid);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-full xl:max-w-[90vw] mx-auto px-4 py-8 space-y-12 bg-gradient-to-br from-blue-100 via-white to-purple-100 min-h-screen">
      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{confirmDialog.title}</h3>
            </div>
            <p className="text-gray-600 mb-6 whitespace-pre-line">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Anulo
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Konfirmo
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">Duke ngarkuar detajet e kontratës...</h2>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto p-6 space-y-10 bg-gradient-to-br from-blue-100 via-white to-purple-100 min-h-screen">
          {/* HEADER MODERN GLASSMORPHISM */}
          <div className="flex items-center gap-6 bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-10 border-b-4 border-blue-400 animate-fade-in">
            <div className="flex-shrink-0 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full p-4 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#7c3aed" className="w-14 h-14">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75h-15a.75.75 0 00-.75.75v12.75c0 .414.336.75.75.75z" />
              </svg>
            </div>
            <div>
              <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight mb-2 drop-shadow-lg">Detajet e Kontratës</h2>
              <div className="text-2xl font-bold text-purple-600 drop-shadow">{contract?.site_name ? contract.site_name : "-"}</div>
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/70 p-10 rounded-3xl shadow-2xl border-2 border-blue-200 animate-fade-in">
            <div className="space-y-3 text-lg">
              <p><span className="font-bold text-blue-800">🏢 Emri i Kompanisë:</span> {contract.company}</p>
              <p><span className="font-bold text-blue-800">#️⃣ Nr Kompanisë:</span> {contract.company_no}</p>
              <p><span className="font-bold text-blue-800">📍 Vendodhja:</span> {contract.site_name}</p>
              <p><span className="font-bold text-blue-800">📬 Adresa:</span> {contract.address}</p>
            </div>
            <div className="space-y-3 text-lg">
              <p><span className="font-bold text-blue-800">🗓 Data e Fillimit:</span> {formatDate(contract.start_date)}</p>
              <p><span className="font-bold text-blue-800">🗓 Data e Mbarimit:</span> {formatDate(contract.finish_date)}</p>
              <p><span className="font-bold text-blue-800">📊 Statusi:</span> <span className={
                contract.status === "Mbyllur" || contract.status === "Mbyllur me vonese" ? "text-red-600" : 
                contract.status === "Ne progres" ? "text-blue-600" : 
                contract.status === "Draft" ? "text-gray-600" : 
                contract.status === "Anulluar" ? "text-red-600" : 
                contract.status === "Pezulluar" ? "text-yellow-600" : "text-green-600"
              }>{contract.status}</span></p>
              {contract.closed_date && <p><span className="font-bold text-blue-800">🔒 Mbyllur më:</span> {formatDate(contract.closed_date)}</p>}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white/70 p-10 shadow-2xl rounded-3xl border-2 border-purple-200 animate-fade-in">
            <h3 className="text-2xl font-bold mb-6 text-purple-800 flex items-center gap-2"><span>📈</span> Progresi i Kontratës</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={getProgressChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Line type="monotone" dataKey="progress" stroke="#a21caf" strokeWidth={4} dot={{ r: 8, fill: '#c7d2fe' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Dokumente */}
          <div className="bg-white/70 p-10 rounded-3xl shadow-2xl border-2 border-blue-200 animate-fade-in">
            <h3 className="text-2xl font-bold mb-4 text-blue-800 flex items-center gap-2">📎 Dokumentet</h3>
            <input 
              type="file" 
              accept="application/pdf" 
              onChange={handleDocumentUpload} 
              disabled={loadingStates.documentUpload}
              className="mb-6 text-base file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-base file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all duration-200 disabled:opacity-50" 
            />
            <ul className="list-none pl-0 text-base text-blue-700 space-y-2">
              {(contract.documents || []).map((doc, idx) => (
                <li key={idx} className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-2 shadow hover:bg-purple-50 transition-all">
                  <span className="bg-gradient-to-br from-blue-200 to-purple-200 rounded-full p-2"><svg xmlns='http://www.w3.org/2000/svg' className='w-6 h-6' fill='none' viewBox='0 0 24 24' stroke='#6366f1'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a2 2 0 10-2.828-2.828z' /></svg></span>
                  <a href={doc.content} download={doc.name} className="underline hover:text-purple-700 transition-colors duration-200 font-semibold">{doc.name}</a>
                  <button 
                    onClick={() => handleDocumentDelete(idx)} 
                    disabled={loadingStates.documentDelete}
                    className="ml-auto text-red-600 text-lg hover:scale-125 transition-transform disabled:opacity-50"
                  >
                    {loadingStates.documentDelete ? '⏳' : '🗑'}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Komente */}
          <div className="bg-white/70 p-10 rounded-3xl shadow-2xl border-2 border-purple-200 animate-fade-in">
            <h3 className="text-2xl font-bold mb-4 text-purple-800 flex items-center gap-2">💬 Komente</h3>
            <div className="flex gap-3 mb-6">
              <textarea 
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)} 
                disabled={loadingStates.addComment}
                className="w-full border-2 border-purple-200 rounded-xl p-3 text-base bg-purple-50 focus:ring-4 focus:ring-purple-300 transition-all shadow-sm disabled:opacity-50" 
                placeholder="Shkruaj një koment..." 
              />
              <button 
                onClick={handleAddComment} 
                disabled={loadingStates.addComment || !newComment.trim()}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-3 rounded-xl shadow-lg font-bold text-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loadingStates.addComment ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Duke shtuar...
                  </>
                ) : (
                  '➕ Shto'
                )}
              </button>
            </div>
            <ul className="mt-4 space-y-4 text-base">
              {(contract.comments || []).map((c, i) => (
                <li key={i} className="flex items-start gap-3 bg-purple-50 rounded-xl px-4 py-3 shadow border-l-4 border-blue-400 animate-fade-in">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center text-xl font-bold text-white shadow-md">{(c.text[0] || '').toUpperCase()}</div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium">{c.text}</p>
                    <span className="text-xs text-gray-500">{new Date(c.date).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Orët e Punës për këtë kontratë */}
          <div className="bg-white/70 p-10 rounded-3xl shadow-2xl border-2 border-green-200 animate-fade-in">
            <h3 className="text-2xl font-bold mb-4 text-green-800 flex items-center gap-2">⏰ Orët e Punës</h3>
            
            {/* Search and Filter for Work Hours */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="🔍 Kërko punonjës ose datë..."
                  value={workHoursSearch}
                  onChange={(e) => setWorkHoursSearch(e.target.value)}
                  className="w-full p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 shadow-sm"
                />
              </div>
              <div>
                <select
                  value={workHoursFilter}
                  onChange={(e) => setWorkHoursFilter(e.target.value)}
                  className="w-full p-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 shadow-sm"
                >
                  <option value="all">Të gjitha llojet</option>
                  <option value="NI">NI</option>
                  <option value="UTR">UTR</option>
                </select>
              </div>
            </div>
            
            {workHours.length > 0 ? (
              <div className="overflow-x-auto">
                {filteredWorkHours.length > 0 ? (
                  <table className="w-full text-sm bg-white shadow rounded-xl">
                    <thead className="bg-gradient-to-r from-green-100 to-blue-100 text-green-900">
                      <tr>
                        <th className="py-3 px-2 text-center font-semibold">Data</th>
                        <th className="py-3 px-2 text-center font-semibold">Punonjësi</th>
                        <th className="py-3 px-2 text-center font-semibold">Orë</th>
                        <th className="py-3 px-2 text-center font-semibold">Tarifa/orë</th>
                        <th className="py-3 px-2 text-center font-semibold">Bruto (£)</th>
                        <th className="py-3 px-2 text-center font-semibold">Neto (£)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorkHours.map((wh, idx) => {
                        const hours = parseFloat(wh.hours || 0);
                        
                        // Gjej punonjësin për të marrë labelType dhe hourly_rate
                        const employee = employees.find(emp => emp.id === wh.employee_id);
                        const labelType = employee?.labelType || employee?.label_type || 'NI';
                        
                        // Përdor tarifën e punonjësit nga databaza, ose nga work_hours nëse ekziston, ose default £15
                        const rate = parseFloat(wh.rate || wh.hourly_rate || employee?.hourly_rate || 15);
                        const gross = hours * rate;
                        
                        // Llogarit neto: 0.7 për NI, 0.8 për UTR
                        const netRate = labelType === 'NI' ? 0.7 : 0.8;
                        const net = gross * netRate;
                        
                        return (
                          <tr key={idx} className="hover:bg-green-50 transition-all">
                            <td className="py-2 px-2 text-center">{new Date(wh.date).toLocaleDateString('sq-AL')}</td>
                            <td className="py-2 px-2 text-center font-medium">
                              {wh.employee_name || `Employee #${wh.employee_id}`}
                              <span className="text-xs ml-2 px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold">
                                {labelType}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-blue-600">{hours}</td>
                            <td className="py-2 px-2 text-center font-bold text-purple-600">£{rate.toFixed(2)}</td>
                            <td className="py-2 px-2 text-center font-bold text-orange-600">£{gross.toFixed(2)}</td>
                            <td className="py-2 px-2 text-center font-bold text-green-600">£{net.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-green-100">
                      <tr>
                        <td colSpan="2" className="py-3 px-2 text-center font-bold text-green-800">TOTALET:</td>
                        <td className="py-3 px-2 text-center font-bold text-blue-700">
                          {filteredWorkHours.reduce((sum, wh) => sum + parseFloat(wh.hours || 0), 0).toFixed(1)} orë
                        </td>
                        <td className="py-3 px-2 text-center">-</td>
                        <td className="py-3 px-2 text-center font-bold text-orange-700 text-lg">
                          £{filteredWorkHours.reduce((sum, wh) => {
                            const hours = parseFloat(wh.hours || 0);
                            const employee = employees.find(emp => emp.id === wh.employee_id);
                            const rate = parseFloat(wh.rate || wh.hourly_rate || employee?.hourly_rate || 15);
                            return sum + (hours * rate);
                          }, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-green-700 text-lg">
                          £{filteredWorkHours.reduce((sum, wh) => {
                            const hours = parseFloat(wh.hours || 0);
                            const employee = employees.find(emp => emp.id === wh.employee_id);
                            const rate = parseFloat(wh.rate || wh.hourly_rate || employee?.hourly_rate || 15);
                            const gross = hours * rate;
                            const labelType = employee?.labelType || employee?.label_type || 'NI';
                            const netRate = labelType === 'NI' ? 0.7 : 0.8;
                            return sum + (gross * netRate);
                          }, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 italic">
                      Nuk u gjetën orë pune që përputhen me kërkimin tuaj
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 italic text-center py-8">Nuk ka orë pune të regjistruara për këtë kontratë akoma</p>
            )}
          </div>

          {/* Butoni për shtim fature */}
          <div className="flex justify-end mb-6">
            <button
              onClick={openAddModal}
              className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
            >
              <span className="text-xl">🧾</span> Shto Faturë
            </button>
          </div>

          {/* Lista Faturave + Print */}
          <div className="bg-white/80 p-10 rounded-3xl shadow-2xl border-2 border-blue-200 animate-fade-in">
            <h3 className="font-bold mb-6 text-2xl text-blue-900 flex items-center gap-3">📋 Lista e Faturave</h3>
            
            {/* Search and Filter for Invoices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="🔍 Kërko faturë, përshkrim ose datë..."
                  value={invoicesSearch}
                  onChange={(e) => setInvoicesSearch(e.target.value)}
                  className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 shadow-sm"
                />
              </div>
              <div>
                <select
                  value={invoicesFilter}
                  onChange={(e) => setInvoicesFilter(e.target.value)}
                  className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 shadow-sm"
                >
                  <option value="all">Të gjitha faturat</option>
                  <option value="paid">Paguar</option>
                  <option value="unpaid">Pa paguar</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {filteredInvoices.length > 0 ? (
                <table className="w-full text-base bg-white shadow rounded-xl">
                  <thead className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-900">
                    <tr>
                      <th className="py-4 px-2 text-center align-middle font-semibold">Nr</th>
                      <th className="py-4 px-2 text-center align-middle font-semibold">Data</th>
                      <th className="py-4 px-2 text-center align-middle font-semibold">Total</th>
                      <th className="py-4 px-2 text-center align-middle font-semibold">Status</th>
                      <th className="py-4 px-2 text-center align-middle font-semibold">Paguar</th>
                      <th className="py-4 px-2 text-center align-middle font-semibold">Veprime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices
                      .slice()
                      .sort((a, b) => a.id - b.id)
                      .map((inv, index) => {
                        const total = inv.items.reduce((a, i) => a + (i.amount || 0), 0) + parseFloat(inv.other || 0) + (inv.items.reduce((a, i) => a + (i.amount || 0), 0) * 0.2);
                        const invoiceDate = new Date(inv.date);
                        const paidDate = inv.paid ? new Date() : null;
                        const oneMonth = 30 * 24 * 60 * 60 * 1000;
                        const status = inv.paid
                          ? paidDate - invoiceDate <= oneMonth
                            ? "Paguar në kohë"
                            : "Paguar me vonesë"
                          : "Pa paguar";
                        return (
                          <tr key={inv.id} className="text-center hover:bg-purple-50 transition-all">
                            <td className="py-3 px-2 align-middle font-semibold">{inv.invoice_number}</td>
                            <td className="py-3 px-2 align-middle">{formatDate(inv.date)}</td>
                            <td className="py-3 px-2 align-middle font-bold text-purple-700">£{total.toFixed(2)}</td>
                            <td className="py-3 px-2 align-middle">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${status === "Pa paguar" ? "bg-red-100 text-red-600" : status === "Paguar në kohë" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{status}</span>
                            </td>
                            <td className="py-3 px-2 align-middle">
                              <input
                                type="checkbox"
                                checked={inv.paid}
                                onChange={() => handleTogglePaid(inv.id, inv.paid)}
                                className="w-5 h-5 accent-green-500 cursor-pointer"
                                disabled={loadingStates.togglePaid[inv.id]}
                              />
                            </td>
                            <td className="py-3 px-2 align-middle flex justify-center gap-2">
                              <button 
                                onClick={() => setInvoiceToPrint(inv)} 
                                className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-all text-xl"
                                title="Shiko / Printo"
                              >
                                🖨
                              </button>
                              <button 
                                onClick={() => handleSendEmail(inv.id)} 
                                disabled={loadingStates.sendEmail[inv.id]}
                                className="text-green-600 hover:text-green-800 hover:scale-110 transition-all text-xl disabled:opacity-50"
                                title="Dërgo në Email"
                              >
                                {loadingStates.sendEmail[inv.id] ? (
                                  <div className="w-4 h-4 border border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  '📧'
                                )}
                              </button>
                              <button 
                                onClick={() => handleDeleteInvoice(inv.id)} 
                                disabled={loadingStates.deleteInvoice[inv.id]}
                                className="text-red-600 hover:text-red-800 hover:scale-110 transition-all text-xl disabled:opacity-50"
                                title="Fshi"
                              >
                                {loadingStates.deleteInvoice[inv.id] ? (
                                  <div className="w-4 h-4 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  '🗑️'
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 italic">
                    {invoices.length === 0 
                      ? "Nuk ka faturat për këtë kontratë akoma" 
                      : "Nuk u gjetën faturat që përputhen me kërkimin tuaj"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {invoiceToPrint && (
            <div className="bg-white p-6 rounded-2xl shadow-xl mt-6 border border-green-300">
              <div
                id="invoice-area"
                className="bg-white print:bg-white text-gray-800 text-sm max-w-[794px] mx-auto p-10 leading-loose"
              >
                <div className="flex justify-between items-center border-b border-green-300 pb-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-extrabold text-amber-600">🧾 FATURË</h1>
                    <p className="text-xs text-gray-500">Kont #{contract.contract_number} – {contract.site_name}</p>
                  </div>
                  <img src="/albanconstruction.png" alt="Alban Construction Logo" className="h-20 w-auto object-contain" />
                  <div className="text-right text-xs">
                    <p><strong>Data:</strong> {invoiceToPrint.date}</p>
                    <p><strong>Kompania:</strong> {contract.company}</p>
                    <p className="text-gray-500 italic">{contract.address}</p>
                  </div>
                </div>

                <table className="w-full border-collapse border border-gray-300 mb-6 text-xs">
                  <thead className="bg-green-100 text-amber-800 font-semibold">
                    <tr>
                      <th className="border border-green-300 py-3 px-2">Përshkrimi</th>
                      <th className="border border-green-300 py-3 px-2">Shifts</th>
                      <th className="border border-green-300 py-3 px-2">Rate</th>
                      <th className="border border-green-300 py-3 px-2">Shuma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceToPrint.items.map((item, i) => (
                      <tr key={i} className="hover:bg-green-50">
                        <td className="border border-gray-300 py-3 px-2">{item.description}</td>
                        <td className="border border-gray-300 py-3 px-2 text-center">{item.shifts}</td>
                        <td className="border border-gray-300 py-3 px-2 text-center">£{item.rate}</td>
                        <td className="border border-gray-300 py-3 px-2 text-right">£{item.amount?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-between mt-8 text-sm">
                  <div className="text-left text-gray-700 space-y-1 max-w-[45%]">
                    <p className="font-bold text-amber-700">Alban Construction Ltd</p>
                    <p>HSBC Bank</p>
                    <p>Account Number: 81845403</p>
                    <p>Sort Code: 52474549</p>
                    <p>Email: adi@albancosntruction.co.uk</p>
                    <p>Phone: +7588893238</p>
                    <p>Website: www.albanconstruction.co.uk</p>
                  </div>

                  <div className="text-right text-sm space-y-4 max-w-[45%] leading-loose">
                    <p><strong>Neto:</strong> £{invoiceToPrint.items.reduce((a, i) => a + (i.amount || 0), 0).toFixed(2)}</p>
                    <p><strong>TVSH (20%):</strong> £{(invoiceToPrint.items.reduce((a, i) => a + (i.amount || 0), 0) * 0.2).toFixed(2)}</p>
                    <p><strong>Të tjera:</strong> £{parseFloat(invoiceToPrint.other || 0).toFixed(2)}</p>
                    <p className="text-lg font-extrabold text-amber-700 mt-2">Total: £{(
                      invoiceToPrint.items.reduce((a, i) => a + (i.amount || 0), 0) +
                      (invoiceToPrint.items.reduce((a, i) => a + (i.amount || 0), 0) * 0.2) +
                      parseFloat(invoiceToPrint.other || 0)
                    ).toFixed(2)}</p>
                  </div>
                </div>
                <p className="text-center text-green-700 font-semibold mt-12">
                  THANK YOU FOR YOUR BUSINESS!
                </p>
              </div>

              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={exportToPDF}
                  className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 shadow-md"
                >
                  📄 Shkarko PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal për shtimin e faturës */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-8"
          onClick={closeAddModal}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-tight flex items-center gap-2">
                  <span className="text-3xl">🧾</span> Shto Faturë të Re
                </h3>
                <button
                  onClick={closeAddModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                <input
                  placeholder="Përshkrimi i faturës"
                  className="p-4 border-2 border-blue-200 rounded-xl w-full text-lg focus:ring-2 focus:ring-blue-300 transition-all shadow-sm"
                  value={newInvoice.description}
                  onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value })}
                />
                
                {newInvoice.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4">
                    <input 
                      placeholder="Përshkrimi" 
                      className="p-3 border-2 border-purple-200 rounded-xl text-base focus:ring-2 focus:ring-purple-300 transition-all" 
                      value={item.description} 
                      onChange={(e) => handleItemChange(index, "description", e.target.value)} 
                    />
                    <input 
                      type="number" 
                      placeholder="Shifts" 
                      className="p-3 border-2 border-purple-200 rounded-xl text-base focus:ring-2 focus:ring-purple-300 transition-all" 
                      value={item.shifts} 
                      onChange={(e) => handleItemChange(index, "shifts", e.target.value)} 
                    />
                    <input 
                      type="number" 
                      placeholder="Rate" 
                      className="p-3 border-2 border-purple-200 rounded-xl text-base focus:ring-2 focus:ring-purple-300 transition-all" 
                      value={item.rate} 
                      onChange={(e) => handleItemChange(index, "rate", e.target.value)} 
                    />
                    <input 
                      disabled 
                      className="p-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-base" 
                      value={`£${item.amount.toFixed(2)}`} 
                    />
                  </div>
                ))}
                
                <button 
                  onClick={handleAddItem} 
                  className="text-base text-blue-700 font-semibold hover:underline transition-all"
                >
                  ➕ Rresht i Ri
                </button>
                
                <div className="flex items-center gap-6">
                  <input 
                    type="number" 
                    placeholder="Të tjera" 
                    className="border-2 border-blue-200 py-3 px-4 text-center align-middle rounded-xl text-base focus:ring-2 focus:ring-blue-300 transition-all" 
                    value={newInvoice.other} 
                    onChange={(e) => setNewInvoice({ ...newInvoice, other: e.target.value })} 
                  />
                  <span className="font-bold text-xl">
                    Total: <span className="text-purple-700">£{grandTotal.toFixed(2)}</span>
                  </span>
                </div>
                
                <div className="flex gap-4 mt-6">
                  <button 
                    onClick={handleSaveInvoice} 
                    className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center gap-3 justify-center disabled:opacity-50 disabled:cursor-not-allowed" 
                    disabled={loadingStates.saveInvoice}
                  >
                    {loadingStates.saveInvoice ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Duke ruajtur...
                      </>
                    ) : (
                      <>
                        <span className="text-2xl">💾</span> Ruaj Faturën
                      </>
                    )}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={closeAddModal}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center gap-3 justify-center"
                  >
                    <span className="text-2xl">✕</span> Anulo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Animacion fade-in */
<style jsx>{`
@keyframes fade-in {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: none; }
}
.animate-fade-in { animation: fade-in 0.7s cubic-bezier(.4,0,.2,1) both; }
`}</style>