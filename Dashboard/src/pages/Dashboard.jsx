import React, { useContext } from 'react';
import { DashboardContext } from '../context/DashboardContext';
import Header from '../components/DashboardPage/Header';
import SummaryCards from '../components/DashboardPage/SummaryCards';
import AnomaliesPanel from '../components/DashboardPage/AnomaliesPanel';
import RiskDistributionChart from '../components/DashboardPage/RiskDistributionChart';
import PredictionTable from '../components/DashboardPage/PredictionTable';
import AnomaliesBreakdown from '../components/DashboardPage/AnomaliesList';

const Dashboard = () => {
  const { summary, containers, anomalies, loading, error } = useContext(DashboardContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Header />
      </div>
    );
  }

  if (!summary && containers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="p-4 space-y-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
          <p className="text-gray-500 dark:text-gray-400">No data available. Please upload a dataset to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Dashboard Overview</h2>
        
        {/* 1. Metric Cards */}
        <SummaryCards summary={summary} />
        
        {/* 2. Anomalies Breakdown */}
        <AnomaliesPanel anomalies={anomalies} summary={summary} />
        
        {/* 3. Visuals Section - Risk Distribution & Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Visual Analytics</h2>
          <RiskDistributionChart summary={summary} />
        </div>
        
        {/* 4. Prediction Results Table */}
        <PredictionTable containers={containers} />

        {/* 5. Detailed anomalies list with filters */}
        <AnomaliesBreakdown anomalies={anomalies} />
        
      </div>
    </div>
  );
};

export default Dashboard;