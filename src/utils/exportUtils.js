// Export utilities for reports and data

export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = async (elementId, filename = 'export.pdf') => {
  try {
    // This would require a PDF library like jsPDF or html2pdf
    // For now, we'll use the browser's print functionality
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Element not found for PDF export');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          ${element.outerHTML}
          <div class="footer">
            Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
  }
};

export const exportDashboardReport = (dashboardData) => {
  const reportData = {
    timestamp: new Date().toISOString(),
    totalPaid: dashboardData.totalPaid,
    totalProfit: dashboardData.totalProfit,
    totalWorkHours: dashboardData.totalWorkHours,
    activeSites: dashboardData.workHoursBysite?.length || 0,
    topEmployees: dashboardData.top5Employees?.slice(0, 5) || [],
    taskStats: {
      total: dashboardData.totalTasks || 0,
      completed: dashboardData.completedTasks || 0,
      ongoing: dashboardData.ongoingTasks || 0
    }
  };

  const filename = `dashboard-report-${new Date().toISOString().split('T')[0]}.json`;
  const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
    type: 'application/json;charset=utf-8;' 
  });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportTasksReport = (tasks) => {
  const tasksData = tasks.map(task => ({
    ID: task.id,
    Përshkrimi: task.description || task.title || '',
    Statusi: task.status,
    Site: task.site_name || task.siteName || '',
    Afati: task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
    Caktuar_nga: task.assigned_by || task.assignedBy || '',
    Caktuar_për: task.assignedTo || '',
    Data_krijimit: task.created_at ? new Date(task.created_at).toLocaleDateString() : ''
  }));

  exportToCSV(tasksData, `tasks-report-${new Date().toISOString().split('T')[0]}.csv`);
};

export const exportWorkHoursReport = (workHoursData, employees) => {
  const hoursData = [];
  
  Object.entries(workHoursData).forEach(([empId, empData]) => {
    const employee = employees.find(emp => emp.id === parseInt(empId));
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
    
    Object.entries(empData).forEach(([week, weekData]) => {
      Object.entries(weekData).forEach(([day, dayData]) => {
        if (dayData?.hours) {
          hoursData.push({
            Punonjësi: employeeName,
            Java: week,
            Dita: day,
            Ora: dayData.hours,
            Site: dayData.site || '',
            Data: dayData.date || ''
          });
        }
      });
    });
  });

  exportToCSV(hoursData, `work-hours-report-${new Date().toISOString().split('T')[0]}.csv`);
};

export const exportFinancialReport = (payments, expenses, invoices) => {
  const financialData = {
    payments: payments.map(p => ({
      ID: p.id,
      Punonjësi: p.employeeName || '',
      Shuma: p.grossAmount,
      Java: p.weekLabel,
      Statusi: p.isPaid ? 'E paguar' : 'E papaguar',
      Data: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : ''
    })),
    expenses: expenses.map(e => ({
      ID: e.id,
      Lloji: e.expenseType,
      Shuma: e.gross,
      Përshkrimi: e.description,
      Statusi: e.paid ? 'E paguar' : 'E papaguar',
      Data: e.date ? new Date(e.date).toLocaleDateString() : ''
    })),
    invoices: invoices.map(i => ({
      ID: i.id,
      Numri_fatures: i.invoiceNumber,
      Kontrata: i.contractNumber,
      Shuma: i.total,
      Statusi: i.paid ? 'E paguar' : 'E papaguar',
      Data: i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString() : ''
    }))
  };

  const filename = `financial-report-${new Date().toISOString().split('T')[0]}.json`;
  const blob = new Blob([JSON.stringify(financialData, null, 2)], { 
    type: 'application/json;charset=utf-8;' 
  });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default {
  exportToCSV,
  exportToPDF,
  exportDashboardReport,
  exportTasksReport,
  exportWorkHoursReport,
  exportFinancialReport
};