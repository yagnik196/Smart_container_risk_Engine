import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PredictionTable from '../components/DashboardPage/PredictionTable';
import analyticsService from '../services/analyticsService';
import dashboardService from '../services/dashboardService';

/**
 * AnalyticsReport – per-file analytics page.
 * Route: /report/:uploadId
 *
 * Shows all containers from a specific CSV upload, with a dedicated
 * Export button that exports only that file's data.
 */
const AnalyticsReport = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();

  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportMenuRef = useRef(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Fetch all pages of containers for this upload
  useEffect(() => {
    if (!uploadId) return;
    const loadContainers = async () => {
      setLoading(true);
      setError(null);
      try {
        let results = [];
        let params = { upload_id: uploadId, page_size: 1000 };
        let response = await dashboardService.fetchContainers(params);
        results = results.concat(response.data.results || []);
        let nextUrl = response.data.next;
        while (nextUrl) {
          const url = new URL(nextUrl);
          const page = url.searchParams.get('page');
          const pageSize = url.searchParams.get('page_size');
          response = await dashboardService.fetchContainers({
            ...params,
            page,
            page_size: pageSize,
          });
          results = results.concat(response.data.results || []);
          nextUrl = response.data.next;
        }
        setContainers(results);
      } catch (err) {
        console.error('Failed to load report containers:', err);
        setError('Failed to load containers for this upload. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadContainers();
  }, [uploadId]);

  const triggerDownload = (data, filename, mime) => {
    const url = window.URL.createObjectURL(new Blob([data], { type: mime }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (format) => {
    setExporting(true);
    setExportMenuOpen(false);
    try {
      const date = new Date().toISOString().split('T')[0];
      const response = await analyticsService.exportData(format, uploadId);
      const mime =
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv';
      triggerDownload(response.data, `report_${uploadId.slice(0, 8)}_${date}.${format}`, mime);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold">Upload Report</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-mono break-all">
              Job ID: {uploadId}
            </p>
          </div>

          {/* Export button */}
          <div ref={exportMenuRef} className="relative">
            <button
              onClick={() => setExportMenuOpen((o) => !o)}
              disabled={containers.length === 0 || exporting}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Exporting…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Export Results ▾
                </>
              )}
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  📄 Export CSV
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  📊 Export Excel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Containers', value: containers.length },
              {
                label: 'Critical',
                value: containers.filter((c) => c.risk_level === 'Critical').length,
                color: 'text-red-600 dark:text-red-400',
              },
              {
                label: 'Medium',
                value: containers.filter((c) => c.risk_level === 'Medium').length,
                color: 'text-yellow-600 dark:text-yellow-400',
              },
              {
                label: 'Low Risk',
                value: containers.filter((c) => c.risk_level === 'Low Risk').length,
                color: 'text-green-600 dark:text-green-400',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded shadow p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color || ''}`}>{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-gray-500 dark:text-gray-400">Loading report data…</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded p-4 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && containers.length === 0 && (
          <div className="text-center py-24 text-gray-500 dark:text-gray-400">
            No containers found for this upload. The job may still be processing.
          </div>
        )}

        {!loading && !error && containers.length > 0 && (
          <PredictionTable containers={containers} />
        )}
      </div>
    </div>
  );
};

export default AnalyticsReport;
