import React from 'react';

const ProcessingLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 dark:bg-opacity-50">
    <div className="p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded shadow">
      <p>Processing...</p>
    </div>
  </div>
);

export default ProcessingLoader;