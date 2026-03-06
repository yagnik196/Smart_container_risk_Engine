import React, { useCallback } from 'react';

const FileUploadZone = ({ onFile }) => {
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        onFile(file);
      }
    },
    [onFile]
  );

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      onFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-10 text-center cursor-pointer bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => document.getElementById('csvInput').click()}
    >
      <input
        id="csvInput"
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
      />
      <p>Drag & drop CSV file here, or click to browse</p>
    </div>
  );
};

export default FileUploadZone;