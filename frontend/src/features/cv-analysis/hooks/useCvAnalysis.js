import { useCallback, useEffect, useState } from 'react';
import { fetchMyAnalysis, uploadCv } from '../services/cvAnalysisService';
import { normalizeAnalysis } from '../utils/analysis';

export const useCvAnalysis = ({ enabled, masters, selectedMaster } = {}) => {
    const [analysis, setAnalysis] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const isAnalysisMissingError = (error) => error?.response?.status === 404;

    const refreshAnalysis = useCallback(async () => {
        if (!enabled) {
            setAnalysis(null);
            setAnalysisLoading(false);
            return null;
        }

        setAnalysisLoading(true);

        try {
            const response = await fetchMyAnalysis();

            if (response.success) {
                const normalizedAnalysis = normalizeAnalysis(response.data.analysis, masters);
                setAnalysis(normalizedAnalysis);
                return normalizedAnalysis;
            }
        } catch (error) {
            if (!isAnalysisMissingError(error)) {
                console.error('Error fetching analysis:', error);
            }
        } finally {
            setAnalysisLoading(false);
        }

        setAnalysis(null);
        return null;
    }, [enabled, masters]);

    useEffect(() => {
        refreshAnalysis();
    }, [refreshAnalysis]);

    useEffect(() => {
        if (!analysis || !selectedMaster) {
            return;
        }

        if (analysis.masterId !== selectedMaster.id) {
            setAnalysis(null);
        }
    }, [analysis, selectedMaster]);

    const uploadAnalysis = useCallback(
        async (file, masterId) => {
            setUploading(true);

            try {
                const response = await uploadCv({ file, masterId });

                if (response.success) {
                    const normalizedAnalysis = normalizeAnalysis(
                        {
                            id: response.data.cvAnalysisId,
                            masterId: response.data.masterId,
                            extractedProfile: response.data.profile,
                            recommendation: response.data.recommendation,
                        },
                        masters
                    );

                    setAnalysis(normalizedAnalysis);
                    return {
                        response,
                        analysis: normalizedAnalysis,
                    };
                }

                return {
                    response,
                    analysis: null,
                };
            } finally {
                setUploading(false);
            }
        },
        [masters]
    );

    return {
        analysis,
        analysisLoading,
        refreshAnalysis,
        setAnalysis,
        uploadAnalysis,
        uploading,
    };
};
