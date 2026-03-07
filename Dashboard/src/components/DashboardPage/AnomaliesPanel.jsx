import React from 'react';

const AnomaliesPanel = ({ anomalies, summary }) => {
  if (!anomalies) return null;

  // We have the raw anomalies list to compute specifics if we want to
  const withWeight = anomalies.filter((r) => {
    const dec = parseFloat(r.declared_weight) || 0;
    const mea = parseFloat(r.measured_weight) || 0;
    const diff = dec ? Math.abs(dec - mea) / dec : 0;
    return diff > 0.1;
  }).length;
  
  const withValue = anomalies.filter((r) => {
    const decVal = parseFloat(r.declared_value) || 0;
    const dec = parseFloat(r.declared_weight) || 0;
    const ratio = dec ? decVal / dec : 0;
    return ratio > 150;
  }).length;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Anomalies Breakdown</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Weight Anomalies</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{withWeight}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Weight differences detected</p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded border border-purple-200 dark:border-purple-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Value Anomalies</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{withValue}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Value-to-weight ratios</p>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200 dark:border-red-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Anomalies</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{summary?.anomaly_count || anomalies.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Containers flagged</p>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded border border-yellow-200 dark:border-yellow-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Risk Score</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{summary?.avg_risk_score ? (summary.avg_risk_score * 100).toFixed(1) : 0}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Average across all</p>
        </div>
      </div>
    </div>
  );
};

export default AnomaliesPanel;