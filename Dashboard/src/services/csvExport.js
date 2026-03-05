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
