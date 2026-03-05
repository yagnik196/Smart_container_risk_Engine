import React from 'react';
import MetricCard from './MetricCard';

const SummaryCards = ({ data }) => {
  const total = data.length;
  const critical = data.filter((r) => r.riskLevel === 'Critical').length;
  const low = total - critical;
  const withPending = data.filter((r) => 
    r.Clearance_Status && r.Clearance_Status.toLowerCase() === 'pending'
  ).length;
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
        color="text-critical"
        subtitle={`${criticalPercent}% of total`}
      />
      <MetricCard 
        title="Low Risk" 
        value={low} 
        color="text-success"
        subtitle={`${(100 - criticalPercent).toFixed(1)}% of total`}
      />
      <MetricCard 
        title="Pending Clearance" 
        value={withPending} 
        color="text-orange-600 dark:text-orange-400"
        subtitle="Awaiting approval"
      />
    </div>
  );
};

export default SummaryCards;