import api from '../api/axios';

const analyticsService = {
    uploadFile: async (formData) => {
        return await api.post('/datasets/upload/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    manualEntry: async (recordsArray) => {
        return await api.post('/datasets/manual-entry/', recordsArray, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    },

    pollJobStatus: async (jobId, intervalMs = 2000, maxAttempts = 60) => {
        let attempts = 0;
        while (attempts < maxAttempts) {
            try {
                const res = await api.get(`/datasets/status/${jobId}/`);
                const { status, message } = res.data;
                if (status === 'completed') {
                    return { success: true, message: message || 'Job completed' };
                }
                if (status === 'failed') {
                    return { success: false, message: message || 'Job failed on the server.' };
                }
                // if 'pending' or 'processing', wait and retry
            } catch (err) {
                console.error('Error polling job status:', err);
            }
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
            attempts++;
        }
        return { success: false, message: 'Timed out waiting for server to process data.' };
    },

    exportData: async (format = 'csv') => {
        return await api.get('/export/', {
            params: { format },
            responseType: 'blob', // required to download files correctly
        });
    },
};

export default analyticsService;
