import { findMasterById } from '../../../shared/utils/masters';

export const normalizeAnalysis = (payload, masters) => {
    if (!payload) return null;

    const master = findMasterById(masters, payload.masterId);

    return {
        ...payload,
        master,
        masterId: payload.masterId || master?.id || null,
        extractedProfile: payload.extractedProfile || payload.profile || {},
        recommendation: payload.recommendation || {},
    };
};

export const buildCvSummary = (analysis) => {
    const profile = analysis?.extractedProfile || {};

    return {
        role: profile.currentRole || 'No especificado',
        industry: profile.industry || 'No especificada',
        experience: profile.yearsOfExperience ? `${profile.yearsOfExperience} anos` : 'No especificada',
        topSkills: (profile.skills || []).slice(0, 4),
    };
};
