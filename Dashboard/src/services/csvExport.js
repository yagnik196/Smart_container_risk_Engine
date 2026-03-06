// Generate CSV for predictions
export const generatePredictionCSV = (data) => {
  const headers = ['Container_ID', 'Risk_Score', 'Risk_Level', 'Explanation_Summary'];
  const rows = data.map((row) => [
    row.Container_ID,
    (row.riskScore * 100).toFixed(2),
    row.riskLevel,
    row.explanation || 'No explanation available'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell}"`).join(',')
    )
  ].join('\n');

  return csvContent;
};

// Download CSV file
export const downloadCSV = (csvContent, filename = 'predictions.csv') => {
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

// Export a simple table as PDF using jsPDF + AutoTable
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPdf = (data, filename = 'predictions.pdf') => {
  const doc = new jsPDF();
  const headers = [['Container ID', 'Risk Score (%)', 'Risk Level', 'Explanation']];

  const rows = data.map((row) => [
    row.Container_ID,
    (row.riskScore * 100).toFixed(2),
    row.riskLevel,
    row.explanation || 'No explanation available'
  ]);

  doc.autoTable({
    head: headers,
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] }
  });

  doc.save(filename);
};

export const exportToExcel = (data, filename = 'predictions.xlsx') => {
  const worksheetData = data.map((row) => ({
    Container_ID: row.Container_ID,
    'Risk Score (%)': (row.riskScore * 100).toFixed(2),
    'Risk Level': row.riskLevel,
    Explanation: row.explanation || 'No explanation available'
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Predictions');
  XLSX.writeFile(workbook, filename);
};
