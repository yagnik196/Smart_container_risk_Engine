import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardContext } from '../../context/DashboardContext';
import { AuthContext } from '../../context/AuthContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const Header = () => {
  const navigate = useNavigate();
  const { summary, containers, anomalies, theme, toggleTheme } = useContext(DashboardContext);
  const { user, logout } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const menuRef = useRef(null);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setIsExportOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleHome = () => {
    navigate('/home');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleUploadNew = () => {
    navigate('/upload');
  };

  const handleFrontendExport = (format) => {
    if (!containers || containers.length === 0) return;

    try {
      const exportData = containers.map((c) => ({
        'Container ID': c.container_id || '',
        'Declared Value ($)': c.declared_value != null ? c.declared_value : '',
        'Declared Weight (kg)': c.weight != null ? c.weight : '',
        'Measured Weight (kg)': c.measured_weight != null ? c.measured_weight : '',
        'Risk Score (%)': c.risk_score != null ? Number(c.risk_score).toFixed(1) : '',
        'Risk Level': c.risk_level || '',
        'Explanation': c.explanation || '',
      }));

      const filename = `dashboard_export_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        const csvContent = Papa.unparse(exportData);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === 'xls') {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Containers');
        XLSX.writeFile(workbook, `${filename}.xlsx`);
      }
    } catch (err) {
      console.error(`Failed to export ${format}`, err);
      alert('Failed to export data locally.');
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Container Risk Dashboard</h1>

        {/* Desktop / large screens: show all action buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <button
            onClick={handleHome}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            🏠 Home
          </button>
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center gap-2 transition-colors duration-200"
              disabled={!containers || containers.length === 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Export
              <svg className={`w-4 h-4 transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden animate-fadeIn">
                <button
                  onClick={() => { handleFrontendExport('csv'); setIsExportOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <span className="font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded text-xs">CSV</span>
                  CSV Format
                </button>
                <button
                  onClick={() => { handleFrontendExport('xls'); setIsExportOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <span className="font-semibold px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded text-xs">XLS</span>
                  Excel Format
                </button>
              </div>
            )}
          </div>
          <button
            onClick={toggleTheme}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          {user ? (
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user.name || user.email || 'User'}
              </span>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              🔐 Login
            </button>
          )}
          <button
            onClick={handleUploadNew}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Upload New File
          </button>
        </div>

        {/* Mobile: show hamburger menu that toggles dropdown */}
        <div ref={menuRef} className="relative md:hidden">
          <button
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none"
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50">
              <button
                onClick={() => {
                  handleFrontendExport('csv');
                  setIsMenuOpen(false);
                }}
                disabled={!containers || containers.length === 0}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                📥 Export CSV
              </button>
              <button
                onClick={() => {
                  handleFrontendExport('xls');
                  setIsMenuOpen(false);
                }}
                disabled={!containers || containers.length === 0}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                📊 Export XLS
              </button>
              <button
                onClick={() => {
                  toggleTheme();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
              </button>
              <button
                onClick={() => {
                  handleHome();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                🏠 Home
              </button>
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Log out ({user.name || user.email || 'User'})
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleLogin();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  🔐 Login
                </button>
              )}
              <button
                onClick={() => {
                  handleUploadNew();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Upload New File
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;