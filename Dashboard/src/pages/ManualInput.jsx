import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardContext } from '../context/DashboardContext';
import ProcessingLoader from '../components/UploadPage/ProcessingLoader';
import analyticsService from '../services/analyticsService';

const INITIAL_FORM = {
  Container_ID: '',
  Importer_ID: '',
  Exporter_ID: '',
  Origin_Country: '',
  Destination_Country: '',
  Destination_Port: '',
  HS_Code: '',
  Shipping_Line: '',
  'Trade_Regime (Import / Export / Transit)': '',
  Declared_Weight: '',
  Measured_Weight: '',
  Declared_Value: '',
  Dwell_Time_Hours: '',
  Declaration_Time: '',
  'Declaration_Date (YYYY-MM-DD)': '',
  Clearance_Status: '',
};

const ManualInput = () => {
  const { theme, toggleTheme } = useContext(DashboardContext);
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [lastRecord, setLastRecord] = useState(null);
  const [sessionRecords, setSessionRecords] = useState([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const required = [
      'Container_ID', 'Importer_ID', 'Exporter_ID', 'Origin_Country', 
      'Destination_Country', 'Destination_Port', 'HS_Code', 'Shipping_Line', 
      'Trade_Regime (Import / Export / Transit)', 'Declared_Weight', 
      'Measured_Weight', 'Declared_Value', 'Dwell_Time_Hours', 
      'Declaration_Time', 'Declaration_Date (YYYY-MM-DD)'
    ];
    const missing = required.filter((key) => !form[key]?.toString().trim());
    if (missing.length) {
      setError(`Please fill all required fields.`);
      return;
    }

    const record = {
      ...form,
      Declared_Value: parseFloat(form.Declared_Value),
      Declared_Weight: parseFloat(form.Declared_Weight),
      Measured_Weight: parseFloat(form.Measured_Weight),
      Dwell_Time_Hours: parseFloat(form.Dwell_Time_Hours)
    };

    setLoading(true);

    try {
      // Adding a temporary batchId or importedAt timestamp for the session display 
      const submittedRecord = {
        ...record,
        importedAt: new Date().toISOString(),
        batchId: Date.now().toString()
      };
      const res = await analyticsService.manualEntry([record]);

      if (res.status === 202 && res.data.job_id) {
        const jobId = res.data.job_id;
        const pollRes = await analyticsService.pollJobStatus(jobId);

        if (pollRes.success) {
          // Success! Add to session records and reset form so the user can view analysis
          setSessionRecords((prev) => [submittedRecord, ...prev]);
          setForm(INITIAL_FORM);
          setError(null);
        } else {
          setError(pollRes.message);
        }
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to submit data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      {loading && <ProcessingLoader />}
      <div className="w-full max-w-lg p-6 bg-white dark:bg-gray-800 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manual Input</h1>
          <button
            onClick={toggleTheme}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Container ID</label>
              <input
                value={form.Container_ID}
                onChange={handleChange('Container_ID')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">HS Code</label>
              <input
                value={form.HS_Code}
                onChange={handleChange('HS_Code')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Importer ID</label>
              <input
                value={form.Importer_ID}
                onChange={handleChange('Importer_ID')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Exporter ID</label>
              <input
                value={form.Exporter_ID}
                onChange={handleChange('Exporter_ID')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Origin Country</label>
              <input
                value={form.Origin_Country}
                onChange={handleChange('Origin_Country')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Destination Country</label>
              <input
                value={form.Destination_Country}
                onChange={handleChange('Destination_Country')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Destination Port</label>
              <input
                value={form.Destination_Port}
                onChange={handleChange('Destination_Port')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Shipping Line</label>
              <input
                value={form.Shipping_Line}
                onChange={handleChange('Shipping_Line')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Trade Regime</label>
              <select
                value={form['Trade_Regime (Import / Export / Transit)']}
                onChange={handleChange('Trade_Regime (Import / Export / Transit)')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              >
                <option value="">Select regime</option>
                <option value="Import">Import</option>
                <option value="Export">Export</option>
                <option value="Transit">Transit</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Declared Value</label>
              <input
                type="number"
                value={form.Declared_Value}
                onChange={handleChange('Declared_Value')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Declared Weight</label>
              <input
                type="number"
                value={form.Declared_Weight}
                onChange={handleChange('Declared_Weight')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Measured Weight</label>
              <input
                type="number"
                value={form.Measured_Weight}
                onChange={handleChange('Measured_Weight')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Dwell Time (Hours)</label>
              <input
                type="number"
                value={form.Dwell_Time_Hours}
                onChange={handleChange('Dwell_Time_Hours')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Declaration Date</label>
              <input
                type="date"
                value={form['Declaration_Date (YYYY-MM-DD)']}
                onChange={handleChange('Declaration_Date (YYYY-MM-DD)')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Declaration Time</label>
              <input
                type="time"
                value={form.Declaration_Time}
                onChange={handleChange('Declaration_Time')}
                className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Clearance Status (optional)</label>
            <select
              value={form.Clearance_Status}
              onChange={handleChange('Clearance_Status')}
              className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
            >
              <option value="">Select status</option>
              <option value="Cleared">Cleared</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <div className="flex justify-end">
            <button
              type="button"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded"
            >
              Add another record
            </button>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="w-full sm:w-auto text-sm text-gray-600 dark:text-gray-300 underline"
            >
              Back to Home
            </button>
            <button
              type="submit"
              onClick={() => setShowAnalysis((prev) => !prev)}
              disabled={sessionRecords.length === 0}
              className="w-full sm:w-auto text-sm text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded disabled:opacity-50"
            >
              {showAnalysis ? 'Hide analysis' : 'Show analysis'}
            </button>
          </div>
        </form>
      </div>

      {showAnalysis && (
        <div className="max-w-4xl mx-auto mt-10 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Session Analysis</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Showing analysis for {sessionRecords.length} record{sessionRecords.length === 1 ? '' : 's'} submitted this session.</p>
          </div>

          {sessionRecords.map((record) => (
            <div key={record.batchId + record.Container_ID + record.importedAt} className="bg-white dark:bg-gray-800 rounded shadow p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Container ID</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{record.Container_ID}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Risk Level</p>
                  <p className={`text-lg font-semibold ${record.riskLevel === 'Critical' ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300'}`}>{record.riskLevel}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Risk Score</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{(record.riskScore * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Imported</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">{new Date(record.importedAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Declared Value</p>
                    <p className="text-sm text-gray-900 dark:text-white">${record.Declared_Value}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Declared Weight</p>
                    <p className="text-sm text-gray-900 dark:text-white">{record.Declared_Weight} kg</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Measured Weight</p>
                    <p className="text-sm text-gray-900 dark:text-white">{record.Measured_Weight} kg</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Clearance Status</p>
                    <p className="text-sm text-gray-900 dark:text-white">{record.Clearance_Status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">HS Code</p>
                    <p className="text-sm text-gray-900 dark:text-white">{record.HS_Code || '—'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Explanation</p>
                    <p className="text-sm text-gray-900 dark:text-white">{record.explanation || 'No explanation available'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Anomaly Details</p>
                    {record.explanation ? (
                      <p className="text-sm text-gray-900 dark:text-white">{record.explanation}</p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No anomalies detected.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManualInput;
