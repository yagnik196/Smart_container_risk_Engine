import React, { useContext } from 'react';
import { DashboardContext } from '../context/DashboardContext';
import Header from '../components/DashboardPage/Header';
import SummaryCards from '../components/DashboardPage/SummaryCards';
import AnomaliesPanel from '../components/DashboardPage/AnomaliesPanel';
import RiskDistributionChart from '../components/DashboardPage/RiskDistributionChart';
import PredictionTable from '../components/DashboardPage/PredictionTable';
import AnomaliesBreakdown from '../components/DashboardPage/AnomaliesList';

const Dashboard = () => {
  const { data } = useContext(DashboardContext);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        {/* 1. Metric Cards */}
        <SummaryCards data={data} />
        
        {/* 2. Anomalies Breakdown */}
        <AnomaliesPanel data={data} />
        
        {/* 3. Visuals Section - Risk Distribution & Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Visual Analytics</h2>
          <RiskDistributionChart data={data} />
        </div>
        
        {/* 4. Prediction Results Table */}
        <PredictionTable data={data} />

        {/* 5. Detailed anomalies list with filters */}
        <AnomaliesBreakdown data={data} />
        
      </div>
    </div>
  );
};

export default Dashboard;