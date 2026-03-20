const {
    serializeStoredRecommendation,
    serializeRecommendationPayload,
} = require('../../services/serialization/recommendation-serializer');
const { serializeAnalysisHistoryItem } = require('../../services/serialization/analysis-serializer');

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
