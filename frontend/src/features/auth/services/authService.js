import api from '../../../shared/lib/http/api-client';

export const fetchCurrentUser = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

export const loginRequest = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
};

export const googleLoginRequest = async (credential) => {
    const response = await api.post('/auth/google', { credential });
    return response.data;
};

export const registerRequest = async (payload) => {
    const response = await api.post('/auth/register', payload);
    return response.data;
};

export const fetchMasters = async () => {
    const response = await api.get('/users/masters');
    return response.data;
};

export const updateSelectedMaster = async (masterId) => {
    const response = await api.put('/users/master', { masterId });
    return response.data;
};
