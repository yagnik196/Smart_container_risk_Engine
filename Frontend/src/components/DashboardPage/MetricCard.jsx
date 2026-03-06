import React from 'react';

const MetricCard = ({ title, value, color, subtitle }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow flex-1 min-w-[200px]">
      <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-bold ${color} mt-2`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{subtitle}</p>}
    </div>
  );
};

export default MetricCard;