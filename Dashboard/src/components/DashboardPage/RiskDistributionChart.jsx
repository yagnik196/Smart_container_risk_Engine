import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#DC2626', '#16A34A'];

const RiskDistributionChart = ({ data }) => {
  const critical = data.filter((r) => r.riskLevel === 'Critical').length;
  const low = data.filter((r) => r.riskLevel === 'Low Risk').length;
  
  const chartData = [
    { name: `Critical (${critical})`, value: critical },
    { name: `Low Risk (${low})`, value: low }
  ];

  return (
    <div className="flex justify-center items-center w-full">
      <ResponsiveContainer width="100%" height={450}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={140}
            label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}
            labelLine={true}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} containers`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RiskDistributionChart;