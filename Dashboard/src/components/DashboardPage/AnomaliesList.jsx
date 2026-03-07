import React from 'react';

const AnomaliesList = ({ anomalies }) => {
  if (!anomalies) return null;
  const total = anomalies.length;

  // classification helpers
  const isWeight = (r) => {
    const dec = parseFloat(r.weight) || 0;
    const mea = parseFloat(r.measured_weight) || 0;
    const diff = dec ? Math.abs(dec - mea) / dec : 0;
    return diff > 0.15; // Adjusted threshold to a reasonable diff
  };
  const isValue = (r) => {
    const decVal = parseFloat(r.declared_value) || 0;
    const dec = parseFloat(r.weight) || 0;
    const ratio = dec ? decVal / dec : 0;
    return ratio > 150;
  };
  const isBehavior = (r) => {
    return !isWeight(r) && !isValue(r);
  };

  const [filter, setFilter] = React.useState('All');

  const filtered = anomalies.filter((r) => {
    if (filter === 'All') return true;
    if (filter === 'Weight') return isWeight(r);
    if (filter === 'Value') return isValue(r);
    if (filter === 'Behavior') return isBehavior(r);
    return true;
  });

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Anomalies List</h3>
      <div className="mb-3">
        <select
          className="border border-gray-300 dark:border-gray-600 px-2 py-1 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="All">All</option>
          <option value="Weight">Weight Difference</option>
          <option value="Value">Value-to-Weight</option>
          <option value="Behavior">Behavioral</option>
        </select>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.map((r, i) => {
          // determine anomaly type description
          let types = [];
          if (isWeight(r)) types.push('Weight Difference');
          if (isValue(r)) types.push('Value-to-Weight');
          if (isBehavior(r)) types.push('Behavioral');
          let type = types.join(', ');

          return (
            <div key={i} className="border-b border-gray-200 dark:border-gray-700 py-2">
              <p className="font-medium text-gray-900 dark:text-white">
                {r.container_id} {type && <span className="text-xs text-gray-500 dark:text-gray-400">({type})</span>}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{r.explanation}</p>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Declared Wt: {r.weight != null ? r.weight : '—'}</span> | <span>Measured Wt: {r.measured_weight != null ? r.measured_weight : '—'}</span> | <span>Declared Val: ${r.declared_value != null ? r.declared_value : '—'}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-gray-500 dark:text-gray-400">No anomalies found for selected filter.</p>}
      </div>
    </div>
  );
};

export default AnomaliesList;
