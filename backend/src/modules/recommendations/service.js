const { AppError } = require('../../shared/errors/app-error');
const { normalizeRecommendation, serializeStoredRecommendation } = require('../../shared/serializers/recommendation.serializer');
const { analyses } = require('../../store');
const { getAllSpecializations, getSpecializationById } = require('../../utils/specializations');
const { generateRecommendation } = require('../../services/openai.service');

const listSpecializations = async () => getAllSpecializations();

const getSpecializationOrThrow = async (id) => {
    const specialization = getSpecializationById(id);

    if (!specialization) {
        throw new AppError('Especializacion no encontrada.', 404);
    }

    return specialization;
};

const getUserRecommendation = async ({ userId }) => {
    const analysis = await analyses.findLatestCompleted(userId);

    if (!analysis) {
        throw new AppError('No tienes una recomendacion aun. Por favor sube tu CV o perfil de LinkedIn.', 404);
    }

    const allSpecs = getAllSpecializations();
    const specialization =
        allSpecs.find((item) => item.name === analysis.recommendation?.primarySpecialization) ||
        allSpecs.find((item) => item.id === analysis.recommendation?.primarySpecializationId) ||
        allSpecs[0];

    return { analysis, specialization };
};

const regenerateUserRecommendation = async ({ cvAnalysisId, user }) => {
    const analysis = await analyses.findById(cvAnalysisId);

    if (!analysis || analysis.userId !== user.id) {
        throw new AppError('Analisis de CV no encontrado.', 404);
    }

    if (!analysis.extractedProfile) {
        throw new AppError('No hay datos de perfil para regenerar la recomendacion.', 400);
    }

    const recommendation = await generateRecommendation(
        analysis.extractedProfile,
        analysis.sourceType,
        { masterId: analysis.masterId || user.selectedMasterId || null }
    );

    const normalized = normalizeRecommendation(recommendation);

    await analyses.update(cvAnalysisId, {
        recommendation: {
            ...serializeStoredRecommendation(normalized),
            springUrl: normalized.sprintUrl,
        },
    });

    return normalized;
};

module.exports = {
    listSpecializations,
    getSpecializationOrThrow,
    getUserRecommendation,
    regenerateUserRecommendation,
};
