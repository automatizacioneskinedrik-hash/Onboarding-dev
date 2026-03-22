import api from '../../../shared/lib/http/api-client';

export const fetchMasterModules = async (masterId) => {
    const response = await api.get('/users/master-modules', {
        params: { masterId },
    });

    return response.data;
};
