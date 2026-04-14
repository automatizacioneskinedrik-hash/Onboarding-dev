import api from '../../../shared/lib/http/api-client';

export const getOnboardingVideo = async () => {
    const response = await api.get('/onboarding/video');
    return response.data;
};

export const updateOnboardingVideo = async (payload) => {
    const response = await api.put('/onboarding/video', payload);
    return response.data;
};
