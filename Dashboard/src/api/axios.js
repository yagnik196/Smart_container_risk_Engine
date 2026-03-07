import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000',
    timeout: 30000,
});

// Interceptor to attach access token
api.interceptors.request.use(
    (config) => {
        const user = JSON.parse(localStorage.getItem('dashboardCurrentUser'));
        if (user && user.access) {
            config.headers.Authorization = `Bearer ${user.access}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor to handle 401s and refresh token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Avoid infinite loops
        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh/') {
            originalRequest._retry = true;

            try {
                const user = JSON.parse(localStorage.getItem('dashboardCurrentUser'));
                if (user && user.refresh) {
                    const res = await axios.post('http://127.0.0.1:8000/auth/refresh/', {
                        refresh: user.refresh,
                    });

                    if (res.status === 200) {
                        // Update the access token in localStorage
                        user.access = res.data.access;
                        if (res.data.refresh) {
                            user.refresh = res.data.refresh; // Handle rolling refresh tokens
                        }
                        localStorage.setItem('dashboardCurrentUser', JSON.stringify(user));

                        // Retry the original request
                        // update the authorization header
                        originalRequest.headers.Authorization = `Bearer ${user.access}`;
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                // If refresh fails, user needs to log in again.
                console.error('Failed to refresh token', refreshError);
                // localStorage.removeItem('dashboardCurrentUser'); // This will be handled by AuthContext logout
                // Optionally redirect to login or let AuthContext pick up the failure
            }
        }

        return Promise.reject(error);
    }
);

export default api;
