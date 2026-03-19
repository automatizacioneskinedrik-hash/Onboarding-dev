/**
 * Recommendation Controller
 * Delegates recommendation flows to the recommendations module.
 */

const { sendSuccess } = require('../shared/http/respond');
const { serializeRecommendationDetails, serializeRegeneratedRecommendation } = require('../modules/recommendations/serializer');
const {
    listSpecializations,
    getSpecializationOrThrow,
    getUserRecommendation,
    regenerateUserRecommendation,
} = require('../modules/recommendations/service');

const getAllSpecializationsHandler = async (req, res, next) => {
    try {
        const specializations = await listSpecializations();

        return sendSuccess(res, {
            data: { specializations, total: specializations.length },
        });
    } catch (error) {
        next(error);
    }
};

const getSpecializationByIdHandler = async (req, res, next) => {
    try {
        const specialization = await getSpecializationOrThrow(req.params.id);

        return sendSuccess(res, {
            data: { specialization },
        });
    } catch (error) {
        next(error);
    }
};

const getMyRecommendation = async (req, res, next) => {
    try {
        const result = await getUserRecommendation({ userId: req.user.id });

        return sendSuccess(res, {
            data: serializeRecommendationDetails(result),
        });
    } catch (error) {
        next(error);
    }
};

const regenerateRecommendation = async (req, res, next) => {
    try {
        const recommendation = await regenerateUserRecommendation({
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
