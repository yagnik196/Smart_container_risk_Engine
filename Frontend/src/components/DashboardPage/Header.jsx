import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardContext } from '../../context/DashboardContext';
import { generatePredictionCSV, downloadCSV } from '../../services/csvExport';

const Header = () => {
  const navigate = useNavigate();
  const { clearData, data, theme, toggleTheme } = useContext(DashboardContext);

  const handleUploadNew = () => {
    clearData();
    navigate('/upload');
  };

  const handleExportCSV = () => {
    const csvContent = generatePredictionCSV(data);
    downloadCSV(csvContent, `predictions_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Container Risk Dashboard</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExportCSV}
            disabled={data.length === 0}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            📥 Export CSV
          </button>
          <button
            onClick={toggleTheme}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button
            onClick={handleUploadNew}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Upload New File
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;