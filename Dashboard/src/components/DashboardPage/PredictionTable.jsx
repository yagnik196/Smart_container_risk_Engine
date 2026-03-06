import React, { useState, useMemo } from 'react';

const PredictionTable = ({ data }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sortField, setSortField] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let arr = data;
    if (search) {
      arr = arr.filter((r) => r.Container_ID && r.Container_ID.includes(search));
    }
    if (filter !== 'All') {
      arr = arr.filter((r) => r.riskLevel === filter);
    }
    if (sortField) {
      arr = [...arr].sort((a, b) => {
        let va = a[sortField];
        let vb = b[sortField];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ? 1 : -1;
        return 0;
      });
    }
    return arr;
  }, [data, search, filter, sortField, sortAsc]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Prediction Results</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search Container ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option>All</option>
          <option>Critical</option>
          <option>Low Risk</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value={25}>25 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse border border-gray-300 dark:border-gray-600">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left cursor-pointer text-gray-900 dark:text-white" onClick={() => toggleSort('Container_ID')}>Container ID</th>
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-gray-900 dark:text-white">Declared Value</th>
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-gray-900 dark:text-white">Weight (D/M)</th>
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left cursor-pointer text-gray-900 dark:text-white" onClick={() => toggleSort('riskScore')}>Risk Score</th>
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-gray-900 dark:text-white">Risk Level</th>
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-gray-900 dark:text-white">Action</th>
            </tr>
          </thead>
          <tbody>
            {current.map((row, i) => (
              <Row key={i} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4 text-gray-900 dark:text-white">
        <div className="text-sm">
          Showing {current.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} results
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            ← Prev
          </button>
          <span className="text-sm">Page {page} of {totalPages || 1}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

const Row = ({ row }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className={`${row.riskLevel === 'Critical' ? 'bg-red-100 dark:bg-red-900 dark:bg-opacity-30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white font-medium">{row.Container_ID}</td>
        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white">${row.Declared_Value}</td>
        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white text-sm">{row.Declared_Weight} kg / {row.Measured_Weight} kg</td>
        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white font-semibold">{(row.riskScore * 100).toFixed(1)}%</td>
        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
          <span className={`px-2 py-1 rounded text-sm font-semibold ${row.riskLevel === 'Critical' ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100' : 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100'}`}>
            {row.riskLevel}
          </span>
        </td>
        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
          <button
            onClick={() => setOpen(!open)}
            className="text-blue-500 dark:text-blue-400 hover:underline text-sm"
          >
            {open ? '▼ Hide' : '▶ Show'}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="border border-gray-300 dark:border-gray-600 px-3 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Explanation:</p>
                <p className="text-sm mt-1">{row.explanation || 'No explanation available'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Clearance Status:</p>
                <p className="text-sm mt-1">{row.Clearance_Status}</p>
              </div>
              {row.HS_Code && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">HS Code:</p>
                  <p className="text-sm mt-1">{row.HS_Code}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default PredictionTable;