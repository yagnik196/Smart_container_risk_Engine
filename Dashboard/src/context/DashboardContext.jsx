import React, { createContext, useState, useEffect } from 'react';
import { loadData, saveData } from '../services/localStorage';
import { calculateRiskScore, categorizeRisk } from '../services/riskScoring';

export const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const stored = loadData();
    if (stored) {
      setData(stored);
    }
    const storedTheme = localStorage.getItem('theme') || 'light';
    setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const processRows = (rows, options = {}) => {
    const { source = 'unknown', batchId = `${Date.now()}` } = options;
    const timestamp = new Date().toISOString();

    return rows.map((row) => {
      const { score, explanation } = calculateRiskScore(row);

      // detect any date-like fields (e.g. shipmentDate, arrival_date)
      const dateFields = Object.keys(row).filter((key) => /date|time/i.test(key));
      const parsedDates = {};

      dateFields.forEach((field) => {
        const value = row[field];
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          parsedDates[field] = parsed.toISOString();
        }
      });

      return {
        ...row,
        ...parsedDates,
        riskScore: score,
        riskLevel: categorizeRisk(score),
        explanation: explanation,
        importedAt: timestamp,
        source,
        batchId
      };
    });
  };

  const processData = (rows, options = {}) => {
    setLoading(true);
    const processed = processRows(rows, options);
    setData(processed);
    saveData(processed);
    setLoading(false);
    return processed;
  };

  const addData = (rows, options = {}) => {
    setLoading(true);
    const processed = processRows(rows, options);
    setData((prev) => {
      const updated = [...prev, ...processed];
      saveData(updated);
      return updated;
    });
    setLoading(false);
    return processed;
  };

  const clearData = () => {
    setData([]);
    saveData([]);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <DashboardContext.Provider value={{ data, loading, processData, addData, clearData, theme, toggleTheme }}>
      {children}
    </DashboardContext.Provider>
  );
};