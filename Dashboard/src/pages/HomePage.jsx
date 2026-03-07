import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardContext } from '../context/DashboardContext';
import { AuthContext } from '../context/AuthContext';
import RiskDistributionChart from '../components/DashboardPage/RiskDistributionChart';
import SummaryCards from '../components/DashboardPage/SummaryCards';
import MetricCard from '../components/DashboardPage/MetricCard';
import analyticsService from '../services/analyticsService';

const HomePage = () => {
  const navigate = useNavigate();
  const { summary, containers, anomalies, theme, toggleTheme } = useContext(DashboardContext);
  const { user, logout } = useContext(AuthContext);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [navigate, user]);

  const handleExportCsv = async () => {
    try {
      const response = await analyticsService.exportData('csv', summary?.latest_upload_id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `predictions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setExportMenuOpen(false);
    } catch (err) {
      console.error('Failed to export CSV', err);
      alert('Failed to export data');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await analyticsService.exportData('xlsx', summary?.latest_upload_id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `predictions_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setExportMenuOpen(false);
    } catch (err) {
      console.error('Failed to export Excel', err);
      alert('Failed to export data');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-10 px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Container Risk Dashboard</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Choose how to provide input for prediction, then monitor risk and export results.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Hello, <span className="font-semibold">{user?.name || user?.email || 'Guest'}</span>
            </div>
            <button
              onClick={toggleTheme}
              className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="mt-10 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Provide input</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Select one of the following ways to add container data for the risk engine.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-3 sm:space-y-0">
            <button
              onClick={() => navigate('/upload')}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded shadow"
            >
              Upload CSV / Excel
            </button>
            <button
              onClick={() => navigate('/upload/json')}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded shadow"
            >
              Upload JSON
            </button>
            <button
              onClick={() => navigate('/manual')}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded shadow"
            >
              Manual Input
            </button>
          </div>
        </div>

        <div className="mt-10">
          <SummaryCards summary={summary} />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard
              title="Avg. Risk Score"
              value={`${(summary?.avg_risk_score || 0).toFixed(1)}%`}
              color="text-blue-600 dark:text-blue-400"
              subtitle="Across all containers"
            />
            <MetricCard
              title="Current Anomalies"
              value={summary?.anomaly_count || anomalies.length}
              color="text-orange-600 dark:text-orange-400"
              subtitle="Containers flagged"
            />
          </div>

          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide">Export Results</h2>
            <div ref={exportMenuRef} className="relative mt-4">
              <button
                onClick={() => setExportMenuOpen((open) => !open)}
                disabled={!summary?.latest_upload_id}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export Current Upload
                <span aria-hidden="true">▾</span>
              </button>

              {exportMenuOpen && (
                <div className="absolute z-20 mt-2 w-full md:w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                  <button
                    onClick={handleExportCsv}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Export Excel
                  </button>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Exports the dataset corresponding to your most recent upload to your machine.
            </p>
          </div>
        </div>

        <div className="mt-10 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Risk Distribution</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Shows how many containers are critical versus low-risk.</p>
          <RiskDistributionChart summary={summary} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
