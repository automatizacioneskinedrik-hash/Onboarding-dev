import api from '../../../shared/lib/http/api-client';

export const fetchMyAnalysis = async () => {
    const response = await api.get('/cv/my-analysis');
    return response.data;
};

export const uploadCv = async ({ file, masterId }) => {
    // El backend espera multipart porque el archivo y el master viajan juntos en el mismo
    // paso de analisis.
    const formData = new FormData();
    formData.append('cv', file);
    formData.append('masterId', masterId);

    const response = await api.post('/cv/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
};
