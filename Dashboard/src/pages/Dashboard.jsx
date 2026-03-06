import React, { useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardContext } from '../context/DashboardContext';
import Header from '../components/DashboardPage/Header';
import SummaryCards from '../components/DashboardPage/SummaryCards';
import AnomaliesPanel from '../components/DashboardPage/AnomaliesPanel';
import RiskDistributionChart from '../components/DashboardPage/RiskDistributionChart';
import PredictionTable from '../components/DashboardPage/PredictionTable';
import AnomaliesBreakdown from '../components/DashboardPage/AnomaliesList';

const Dashboard = () => {
  const { data } = useContext(DashboardContext);
  const { state } = useLocation();
  const batchId = state?.batchId;
  const source = state?.source;

  const viewData = useMemo(() => {
    if (!batchId) return data;
    return data.filter((row) => row.batchId === batchId);
  }, [data, batchId]);

  const viewTitle = batchId
    ? `Showing results for ${source?.toUpperCase() || 'upload'} batch (${viewData.length} record${viewData.length === 1 ? '' : 's'})`
    : 'Showing all stored results';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{viewTitle}</h2>
        {/* 1. Metric Cards */}
        <SummaryCards data={viewData} />
        
        {/* 2. Anomalies Breakdown */}
        <AnomaliesPanel data={viewData} />
        
        {/* 3. Visuals Section - Risk Distribution & Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Visual Analytics</h2>
          <RiskDistributionChart data={viewData} />
        </div>
        
        {/* 4. Prediction Results Table */}
        <PredictionTable data={viewData} />

        {/* 5. Detailed anomalies list with filters */}
        <AnomaliesBreakdown data={viewData} />
        
      </div>
    </div>
  );
};

export default Dashboard;