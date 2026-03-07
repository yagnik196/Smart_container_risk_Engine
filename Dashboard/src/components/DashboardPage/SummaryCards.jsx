import React from 'react';
import MetricCard from './MetricCard';

const SummaryCards = ({ summary }) => {
  if (!summary) return null;

  const total = summary.total_containers || 0;
  const critical = summary.critical_containers || 0;
  const low = summary.low_risk_containers || 0;
  
  // Pending clearance isn't tracked in backend summary by default, but you could add it.
  // We will display the average risk score instead, which is provided
  const avgRisk = summary.avg_risk_score || 0;
  const criticalPercent = total > 0 ? ((critical / total) * 100).toFixed(1) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard 
        title="Total Containers" 
        value={total} 
        color="text-gray-800 dark:text-blue-400"
        subtitle="Processed"
      />
      <MetricCard 
        title="Critical Risk" 
        value={critical} 
        color="text-critical text-red-600 dark:text-red-400"
        subtitle={`${criticalPercent}% of total`}
      />
      <MetricCard 
        title="Low Risk" 
        value={low} 
        color="text-success text-green-600 dark:text-green-400"
        subtitle={`${(100 - criticalPercent).toFixed(1)}% of total`}
      />
      <MetricCard 
        title="Average Risk Score" 
        value={`${(avgRisk).toFixed(1)}%`} 
        color="text-yellow-600 dark:text-yellow-400"
        subtitle="Across all containers"
      />
    </div>
  );
};

export default SummaryCards;