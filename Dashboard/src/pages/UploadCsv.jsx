import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardContext } from '../context/DashboardContext';
import FileUploadZone from '../components/UploadPage/FileUploadZone';
import ProcessingLoader from '../components/UploadPage/ProcessingLoader';
import analyticsService from '../services/analyticsService';

const UploadCsv = () => {
  const { theme, toggleTheme } = useContext(DashboardContext);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file) => {
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await analyticsService.uploadFile(formData);

      if (uploadRes.status === 202 && uploadRes.data.job_id) {
        const jobId = uploadRes.data.job_id;
        const pollRes = await analyticsService.pollJobStatus(jobId);

        if (pollRes.success) {
          navigate(`/report/${jobId}`);
        } else {
          setError(pollRes.message);
        }
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to upload file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      {loading && <ProcessingLoader />}
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload CSV / Excel</h1>
          <button
            onClick={toggleTheme}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <FileUploadZone onFile={handleFile} accept=".csv,.xlsx,.xls" />
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default UploadCsv;
