const { AppError } = require('../services/errors/app-error');
const { getAllSpecializations, getSpecializationById } = require('../utils/seed-learning-content');

const createGenerateRecommendationUseCases = ({ analysisRepo, aiOrchestrator }) => {
    const listSpecializations = async ({ masterId } = {}) => getAllSpecializations(masterId);

    const getSpecializationOrThrow = async (id, { masterId } = {}) => {
        const specialization = getSpecializationById(id, masterId);

        if (!specialization) {
            throw new AppError('Especializacion no encontrada.', 404);
        }

        return specialization;
    };

    const getUserRecommendation = async ({ userId }) => {
        const analysis = await analysisRepo.findLatestCompleted(userId);

        if (!analysis) {
            throw new AppError('No tienes una recomendacion aun. Por favor sube tu CV o perfil de LinkedIn.', 404);
        }

        const allSpecs = getAllSpecializations(analysis.masterId);
        const specialization =
            allSpecs.find((item) => item.name === analysis.recommendation?.primarySpecialization) ||
            allSpecs.find((item) => item.id === analysis.recommendation?.primarySpecializationId) ||
            allSpecs[0];

        return { analysis, specialization };
    };

    const generateRecommendationForProfile = async ({ profile, sourceType = 'pdf', masterId, log }) =>
        aiOrchestrator.generateRecommendation({
            profile,
            sourceType,
            options: { masterId },
            log,
        });

    return {
        listSpecializations,
        getSpecializationOrThrow,
        getUserRecommendation,
        generateRecommendationForProfile,
    };
};

module.exports = {
    createGenerateRecommendationUseCases,
};
