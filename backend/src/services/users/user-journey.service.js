const USER_ONBOARDING_STAGES = {
    SELECT_MASTER: 'select_master',
    UPLOAD_CV: 'upload_cv',
    REVIEW_RECOMMENDATION: 'review_recommendation',
};

const buildEmptyJourneyContext = (timestamp = null) => ({
    latestChatId: null,
    latestCompletedAnalysisId: null,
    chatCount: 0,
    analysisCount: 0,
    lastChatAt: null,
    lastAnalysisAt: null,
    lastActivityAt: timestamp,
    onboardingStage: USER_ONBOARDING_STAGES.SELECT_MASTER,
});

const resolveUserOnboardingStage = ({ selectedMasterId, activeAnalysisId }) => {
    if (!selectedMasterId) {
        return USER_ONBOARDING_STAGES.SELECT_MASTER;
    }

    if (!activeAnalysisId) {
        return USER_ONBOARDING_STAGES.UPLOAD_CV;
    }

    return USER_ONBOARDING_STAGES.REVIEW_RECOMMENDATION;
};

const normalizeUserJourneyContext = (user = {}) => {
    const base = buildEmptyJourneyContext(user.createdAt || null);
    const current = user.journeyContext || {};

    return {
        ...base,
        ...current,
        onboardingStage: resolveUserOnboardingStage({
            selectedMasterId: user.selectedMasterId,
            activeAnalysisId: user.cvAnalysisId,
        }),
    };
};

const buildUserJourneyUpdate = ({ user, userFields = {}, journeyFields = {} }) => {
    const currentUser = user || {};
    const nextUser = { ...currentUser, ...userFields };
    const nextJourneyContext = {
        ...normalizeUserJourneyContext(nextUser),
        ...journeyFields,
    };

    nextJourneyContext.onboardingStage = resolveUserOnboardingStage({
        selectedMasterId: nextUser.selectedMasterId,
        activeAnalysisId: nextUser.cvAnalysisId,
    });

    return {
        ...userFields,
        journeyContext: nextJourneyContext,
    };
};

module.exports = {
    USER_ONBOARDING_STAGES,
    buildEmptyJourneyContext,
    normalizeUserJourneyContext,
    buildUserJourneyUpdate,
    resolveUserOnboardingStage,
};
