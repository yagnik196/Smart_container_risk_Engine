import api from '../api/axios';

const authService = {
    login: async (username, password) => {
        return await api.post('/auth/login/', { username, password });
    },

    register: async (username, email, password) => {
        return await api.post('/auth/register/', { username, email, password });
    },
};

export default authService;
