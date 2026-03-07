import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardContext } from '../context/DashboardContext';
import ProcessingLoader from '../components/UploadPage/ProcessingLoader';
import analyticsService from '../services/analyticsService';

const UploadJson = () => {
  const { theme, toggleTheme } = useContext(DashboardContext);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (file) => {
    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const rows = Array.isArray(parsed) ? parsed : [parsed];

        if (!rows.length) {
          throw new Error('JSON file contains no records');
        }

        const res = await analyticsService.manualEntry(rows);

        if (res.status === 202 && res.data.job_id) {
          const jobId = res.data.job_id;
          const pollRes = await analyticsService.pollJobStatus(jobId);

          if (pollRes.success) {
            navigate(`/report/${jobId}`);
          } else {
            setError(pollRes.message);
          }
        } else {
          setError('Unexpected response from server.');
        }
      } catch (e) {
        console.error(e);
        setError(e.response?.data?.error || e.message || 'Failed to parse/upload JSON');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setLoading(false);
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      {loading && <ProcessingLoader />}
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload JSON</h1>
          <button
            onClick={toggleTheme}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Select JSON file</label>
          <input
            type="file"
            accept="application/json"
            className="w-full text-sm text-gray-700 dark:text-gray-200"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {error && <p className="text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default UploadJson;
