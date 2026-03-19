const normalizeRecommendation = (recommendation = {}) => ({
    primarySpecialization: recommendation.primarySpecialization || recommendation.specialization?.name || null,
    primarySpecializationId: recommendation.primarySpecializationId || recommendation.specialization?.id || null,
    secondarySpecializations: recommendation.secondarySpecializations || [],
    matchScore: recommendation.matchScore || 0,
    reasoning: recommendation.reasoning || null,
    subjects: recommendation.subjects || recommendation.specialization?.subjects || [],
    sprintUrl: recommendation.sprintUrl || recommendation.springUrl || recommendation.specialization?.sprintUrl || '#',
    recommendedCourses: recommendation.recommendedCourses || [],
    specialization: recommendation.specialization || null,
});

const serializeStoredRecommendation = (recommendation = {}) => {
    const normalized = normalizeRecommendation(recommendation);

    return {
        primarySpecialization: normalized.primarySpecialization,
        primarySpecializationId: normalized.primarySpecializationId,
        secondarySpecializations: normalized.secondarySpecializations,
        matchScore: normalized.matchScore,
        reasoning: normalized.reasoning || 'No se pudo generar un razonamiento detallado.',
        subjects: normalized.subjects,
        sprintUrl: normalized.sprintUrl,
        recommendedCourses: normalized.recommendedCourses,
    };
};

const serializeRecommendationPayload = (recommendation = {}) => {
    const normalized = normalizeRecommendation(recommendation);

    return {
        specialization: normalized.specialization,
        matchScore: normalized.matchScore,
        reasoning: normalized.reasoning,
        subjects: normalized.subjects,
        springUrl: normalized.sprintUrl,
        secondarySpecializations: normalized.secondarySpecializations,
        recommendedCourses: normalized.recommendedCourses,
    };
};

const serializeRecommendationSummary = (recommendation = {}, fallbackSpecialization = null) => {
    const normalized = normalizeRecommendation(recommendation);
    const specialization = normalized.specialization || fallbackSpecialization;

    return {
        specialization,
        matchScore: normalized.matchScore,
        reasoning: normalized.reasoning,
        subjects: normalized.subjects.length ? normalized.subjects : specialization?.subjects || [],
        springUrl: normalized.sprintUrl || specialization?.springUrl,
        secondarySpecializations: normalized.secondarySpecializations,
        recommendedCourses: normalized.recommendedCourses,
    };
};

module.exports = {
    normalizeRecommendation,
    serializeStoredRecommendation,
    serializeRecommendationPayload,
    serializeRecommendationSummary,
};
