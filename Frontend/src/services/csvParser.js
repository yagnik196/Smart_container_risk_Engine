import Papa from 'papaparse';

// required headers
const REQUIRED = [
  'Container_ID',
  'Declared_Value',
  'Declared_Weight',
  'Measured_Weight',
  'Clearance_Status'
];

export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, errors, meta } = results;
        if (errors.length) {
          reject(errors);
          return;
        }
        const headers = meta.fields;
        const missing = REQUIRED.filter((h) => !headers.includes(h));
        if (missing.length) {
          reject(new Error('Missing required columns: ' + missing.join(', ')));
          return;
        }
        resolve(data);
      },
      error: (err) => reject(err)
    });
  });
};
