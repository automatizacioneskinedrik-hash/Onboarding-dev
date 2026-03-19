const { serializeStoredRecommendation, serializeRecommendationPayload } = require('../../shared/serializers/recommendation.serializer');
const { serializeAnalysisHistoryItem } = require('../../shared/serializers/analysis.serializer');

const serializeCompletedAnalysis = ({ analysisId, masterId, profile, recommendation }) => ({
    cvAnalysisId: analysisId,
    masterId,
    profile,
    recommendation: serializeStoredRecommendation(recommendation),
});

const serializeLinkedinAnalysis = ({ analysisId, masterId, profile, recommendation }) => ({
    cvAnalysisId: analysisId,
    masterId,
    profile,
    recommendation: serializeRecommendationPayload(recommendation),
});

const serializeAnalysisHistory = (analyses = []) => analyses.map(serializeAnalysisHistoryItem);

module.exports = {
    serializeCompletedAnalysis,
    serializeLinkedinAnalysis,
    serializeAnalysisHistory,
};
