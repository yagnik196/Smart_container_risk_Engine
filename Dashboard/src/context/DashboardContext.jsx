import React, { createContext, useState, useEffect, useContext } from 'react';
import dashboardService from '../services/dashboardService';
import { AuthContext } from './AuthContext';

export const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);

  const [summary, setSummary] = useState(null);
  const [containers, setContainers] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'light';
    setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch all pages from a paginated API endpoint
  const fetchAllPages = async (fetchFn, params = {}) => {
    let results = [];
    let response = await fetchFn(params);
    results = results.concat(response.data.results || []);
    let nextUrl = response.data.next;
    while (nextUrl) {
      // Extract page number from the next URL
      const url = new URL(nextUrl);
      const page = url.searchParams.get('page');
      const pageSize = url.searchParams.get('page_size');
      response = await fetchFn({ ...params, page, page_size: pageSize });
      results = results.concat(response.data.results || []);
      nextUrl = response.data.next;
    }
    return results;
  };

  // Fetch all dashboard data from the API
  const fetchDashboardData = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, containersAll, anomaliesAll] = await Promise.all([
        dashboardService.fetchSummary(),
        fetchAllPages(dashboardService.fetchContainers, { page_size: 1000 }),
        fetchAllPages(dashboardService.fetchAnomalies, { page_size: 1000 }),
      ]);

      setSummary(summaryRes.data);
      setContainers(containersAll);
      setAnomalies(anomaliesAll);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch data when the user is authenticated and navigating to Dashboard
  // It will be also explicitly called after file uploads to refresh the data
  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    } else {
      clearData();
    }
  }, [isAuthenticated]);

  const clearData = () => {
    setSummary(null);
    setContainers([]);
    setAnomalies([]);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <DashboardContext.Provider
      value={{
        summary,
        containers,
        anomalies,
        loading,
        error,
        fetchDashboardData,
        clearData,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};