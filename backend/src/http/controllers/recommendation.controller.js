/**
 * Recommendation Controller
 * Delegates recommendation flows to the recommendations module.
 */

const { getAppContainer } = require('../../composition-root');
const { sendSuccess } = require('../respond');
const {
    serializeRecommendationDetails,
    serializeRegeneratedRecommendation,
} = require('../serializers/recommendations.serializer');
const getUseCases = () => getAppContainer().useCases;

const getAllSpecializationsHandler = async (req, res, next) => {
    try {
        const specializations = await getUseCases().listSpecializations({
            masterId: req.query.masterId,
        });

        return sendSuccess(res, {
            data: { specializations, total: specializations.length },
        });
    } catch (error) {
        next(error);
    }
};

const getSpecializationByIdHandler = async (req, res, next) => {
    try {
        const specialization = await getUseCases().getSpecializationOrThrow(req.params.id, {
            masterId: req.query.masterId,
        });

        return sendSuccess(res, {
            data: { specialization },
        });
    } catch (error) {
        next(error);
    }
};

const getMyRecommendation = async (req, res, next) => {
    try {
        const result = await getUseCases().getUserRecommendation({ userId: req.user.id });

        return sendSuccess(res, {
            data: serializeRecommendationDetails(result),
        });
    } catch (error) {
        next(error);
    }
};

const regenerateRecommendation = async (req, res, next) => {
    try {
        const recommendation = await getUseCases().regenerateUserRecommendation({
            cvAnalysisId: req.body.cvAnalysisId,
            user: req.user,
        });

        return sendSuccess(res, {
            message: 'Recomendacion regenerada exitosamente.',
            data: serializeRegeneratedRecommendation(recommendation),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllSpecializationsHandler,
    getSpecializationByIdHandler,
    getMyRecommendation,
    regenerateRecommendation,
};
