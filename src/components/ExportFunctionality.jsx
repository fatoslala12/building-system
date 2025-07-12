import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileText, BarChart3, Users, Calendar } from 'lucide-react';

export default function ExportFunctionality({ data, type = 'tasks' }) {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');

  const exportData = async (format) => {
    setExporting(true);
    
    try {
      let exportData = [];
      let filename = '';

      switch (type) {
        case 'tasks':
          exportData = data.map(task => ({
            'Përshkrimi': task.description || task.title,
            'Site': task.site_name || task.siteName,
            'Statusi': task.status,
            'Afati': task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
            'Caktuar nga': task.assigned_by || task.assignedBy,
            'Caktuar për': task.assigned_to || task.assignedTo,
            'Data e krijimit': task.created_at ? new Date(task.created_at).toLocaleDateString() : ''
          }));
          filename = 'detyrat';
          break;

        case 'employees':
          exportData = data.map(emp => ({
            'Emri': emp.first_name || emp.firstName,
            'Mbiemri': emp.last_name || emp.lastName,
            'Email': emp.email,
            'Telefon': emp.phone,
            'Statusi': emp.status,
            'Pozicioni': emp.position,
            'Data e regjistrimit': emp.created_at ? new Date(emp.created_at).toLocaleDateString() : ''
          }));
          filename = 'punonjesit';
          break;

        case 'workHours':
          exportData = data.map(record => ({
            'Punonjësi': record.employee_name,
            'Site': record.site,
            'Data': record.date,
            'Orë të punuara': record.hours,
            'Përshkrimi': record.description,
            'Statusi': record.status
          }));
          filename = 'ore_pune';
          break;

        case 'payments':
          exportData = data.map(payment => ({
            'Punonjësi': payment.employee_name,
            'Shuma': payment.amount,
            'Data': payment.date,
            'Statusi': payment.status,
            'Metoda e pagesës': payment.payment_method,
            'Referenca': payment.reference
          }));
          filename = 'pagesat';
          break;

        default:
          exportData = data;
          filename = 'te_dhenat';
      }

      if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else if (format === 'csv') {
        const csvContent = convertToCSV(exportData);
        downloadCSV(csvContent, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      } else if (format === 'json') {
        downloadJSON(exportData, `${filename}_${new Date().toISOString().split('T')[0]}.json`);
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert('Gabim gjatë eksportit të të dhënave');
    } finally {
      setExporting(false);
    }
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSON = (data, filename) => {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getIcon = () => {
    switch (type) {
      case 'tasks': return <FileText className="w-4 h-4" />;
      case 'employees': return <Users className="w-4 h-4" />;
      case 'workHours': return <BarChart3 className="w-4 h-4" />;
      case 'payments': return <Calendar className="w-4 h-4" />;
      default: return <Download className="w-4 h-4" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'tasks': return 'Eksport Detyrat';
      case 'employees': return 'Eksport Punonjësit';
      case 'workHours': return 'Eksport Orët e Punës';
      case 'payments': return 'Eksport Pagesat';
      default: return 'Eksport Të Dhënat';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center gap-2 mb-3">
        {getIcon()}
        <h3 className="font-medium text-sm">{getTitle()}</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
            <option value="json">JSON (.json)</option>
          </select>
          
          <button
            onClick={() => exportData(exportFormat)}
            disabled={exporting || !data || data.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors"
          >
            {exporting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Duke eksportuar...
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                Eksport
              </>
            )}
          </button>
        </div>
        
        <div className="text-xs text-gray-500">
          {data && data.length > 0 ? (
            `${data.length} rreshta të gatshme për eksport`
          ) : (
            'Nuk ka të dhëna për eksport'
          )}
        </div>
      </div>
    </div>
  );
}