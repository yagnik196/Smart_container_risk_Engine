import React, { useContext, useState } from 'react';
import { DashboardContext } from '../context/DashboardContext';
import { parseCSV } from '../services/csvParser';
import FileUploadZone from '../components/UploadPage/FileUploadZone';
import ProcessingLoader from '../components/UploadPage/ProcessingLoader';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
  const { processData, loading, theme, toggleTheme } = useContext(DashboardContext);
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const handleFile = (file) => {
    setError(null);
    parseCSV(file)
      .then((rows) => {
        processData(rows);
        navigate('/dashboard');
      })
      .catch((e) => {
        console.error(e);
        setError(e.message || 'Failed to parse file');
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      {loading && <ProcessingLoader />}
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Container CSV</h1>
          <button
            onClick={toggleTheme}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <FileUploadZone onFile={handleFile} />
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default Upload;