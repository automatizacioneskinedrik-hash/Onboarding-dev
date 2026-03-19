const { serializeRecommendationSummary, serializeRecommendationPayload, normalizeRecommendation } = require('../../shared/serializers/recommendation.serializer');

const serializeRecommendationDetails = ({ analysis, specialization }) => ({
    recommendation: serializeRecommendationSummary(analysis.recommendation, specialization),
    profile: analysis.extractedProfile,
    masterId: analysis.masterId || null,
    analysisDate: analysis.processedAt,
    sourceType: analysis.sourceType,
});

const serializeRegeneratedRecommendation = (recommendation) => ({
    recommendation: serializeRecommendationPayload(normalizeRecommendation(recommendation)),
});

module.exports = {
    serializeRecommendationDetails,
    serializeRegeneratedRecommendation,
};
