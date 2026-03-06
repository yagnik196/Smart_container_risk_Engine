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

  const processData = (rows) => {
    setLoading(true);
    const processed = rows.map((row) => {
      const { score, explanation } = calculateRiskScore(row);
      return {
        ...row,
        riskScore: score,
        riskLevel: categorizeRisk(score),
        explanation: explanation
      };
    });
    setData(processed);
    saveData(processed);
    setLoading(false);
  };

  const clearData = () => {
    setData([]);
    saveData([]);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <DashboardContext.Provider value={{ data, loading, processData, clearData, theme, toggleTheme }}>
      {children}
    </DashboardContext.Provider>
  );
};