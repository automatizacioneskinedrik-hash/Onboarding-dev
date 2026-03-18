import axios from 'axios';

// Prefer explicit env URL when provided; fallback to local proxy path.
export const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

console.log('🚀 LAR University API initialized at:', API_URL);

// Request interceptor for adding the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('eduai_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
