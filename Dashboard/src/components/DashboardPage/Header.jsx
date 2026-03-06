import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardContext } from '../../context/DashboardContext';
import { generatePredictionCSV, downloadCSV } from '../../services/csvExport';

const Header = () => {
  const navigate = useNavigate();
  const { clearData, data, theme, toggleTheme } = useContext(DashboardContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleHome = () => {
    navigate('/home');
  };

  const handleLogin = () => {
    navigate('/login');
  };

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

        {/* Desktop / large screens: show all action buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <button
            onClick={handleHome}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            🏠 Home
          </button>
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
            onClick={handleLogin}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            🔐 Login
          </button>
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
                  handleExportCSV();
                  setIsMenuOpen(false);
                }}
                disabled={data.length === 0}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                📥 Export CSV
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
              <button
                onClick={() => {
                  handleLogin();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                🔐 Login
              </button>
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