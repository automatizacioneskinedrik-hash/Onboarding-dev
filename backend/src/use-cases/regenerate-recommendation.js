const { AppError } = require('../services/errors/app-error');
const {
    normalizeRecommendation,
    serializeStoredRecommendation,
} = require('../services/serialization/recommendation-serializer');

const createRegenerateRecommendationUseCases = ({ analysisRepo, aiOrchestrator }) => {
    const regenerateUserRecommendation = async ({ cvAnalysisId, user, log }) => {
        const analysis = await analysisRepo.findById(cvAnalysisId);

        if (!analysis || analysis.userId !== user.id) {
            throw new AppError('Analisis de CV no encontrado.', 404);
        }

        if (!analysis.extractedProfile) {
            throw new AppError('No hay datos de perfil para regenerar la recomendacion.', 400);
        }

        const recommendation = await aiOrchestrator.generateRecommendation({
            profile: analysis.extractedProfile,
            sourceType: analysis.sourceType,
            options: { masterId: analysis.masterId || user.selectedMasterId || null },
            log,
        });

        const normalized = normalizeRecommendation(recommendation);

        await analysisRepo.update(cvAnalysisId, {
            recommendation: {
                ...serializeStoredRecommendation(normalized),
                springUrl: normalized.sprintUrl,
            },
        });

        return normalized;
    };

    return {
        regenerateUserRecommendation,
    };
};

module.exports = {
    createRegenerateRecommendationUseCases,
};
