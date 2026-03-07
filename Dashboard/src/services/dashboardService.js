import api from '../api/axios';

const dashboardService = {
    fetchSummary: async () => {
        return await api.get('/dashboard/summary/');
    },

    fetchContainers: async (params = {}) => {
        return await api.get('/dashboard/containers/', { params });
    },

    fetchAnomalies: async (params = {}) => {
        return await api.get('/dashboard/anomalies/', { params });
    },
};

export default dashboardService;
