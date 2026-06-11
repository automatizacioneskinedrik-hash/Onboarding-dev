const test = require('node:test');
const assert = require('node:assert/strict');

const {
    USER_ONBOARDING_STAGES,
    buildEmptyJourneyContext,
    buildUserJourneyUpdate,
    normalizeUserJourneyContext,
} = require('../src/services/users/user-journey.service');

test('buildEmptyJourneyContext creates a scalable default summary', () => {
    const context = buildEmptyJourneyContext('2026-03-22T10:00:00.000Z');

    assert.deepEqual(context, {
        latestChatId: null,
        latestCompletedAnalysisId: null,
        chatCount: 0,
        analysisCount: 0,
        lastChatAt: null,
        lastAnalysisAt: null,
        lastActivityAt: '2026-03-22T10:00:00.000Z',
        onboardingStage: USER_ONBOARDING_STAGES.SELECT_MASTER,
    });
});

test('normalizeUserJourneyContext resolves onboarding stage from active user state', () => {
    // La etapa activa depende del estado util del usuario hoy, no solo del historial acumulado.
    const uploadContext = normalizeUserJourneyContext({
        selectedMasterId: 'mtecmba',
        cvAnalysisId: null,
        journeyContext: { analysisCount: 2 },
    });
    const recommendationContext = normalizeUserJourneyContext({
        selectedMasterId: 'mtecmba',
        cvAnalysisId: 'analysis-1',
        journeyContext: { latestCompletedAnalysisId: 'analysis-0' },
    });

    assert.equal(uploadContext.onboardingStage, USER_ONBOARDING_STAGES.UPLOAD_CV);
    assert.equal(recommendationContext.onboardingStage, USER_ONBOARDING_STAGES.REVIEW_RECOMMENDATION);
});

test('buildUserJourneyUpdate preserves history while recalculating active stage', () => {
    // Cambiar de master no debe borrar el historial; solo recalcular la etapa visible desde
    // la nueva combinacion de campos activos.
    const update = buildUserJourneyUpdate({
        user: {
            id: 'user-1',
            selectedMasterId: 'mba-1',
            cvAnalysisId: 'analysis-old',
            journeyContext: {
                latestCompletedAnalysisId: 'analysis-old',
                analysisCount: 3,
            },
        },
        userFields: {
            selectedMasterId: 'mba-2',
            cvAnalysisId: null,
            recommendedSpecialization: null,
        },
        journeyFields: {
            lastActivityAt: '2026-03-22T11:00:00.000Z',
        },
    });

    assert.equal(update.journeyContext.latestCompletedAnalysisId, 'analysis-old');
    assert.equal(update.journeyContext.analysisCount, 3);
    assert.equal(update.journeyContext.onboardingStage, USER_ONBOARDING_STAGES.UPLOAD_CV);
    assert.equal(update.journeyContext.lastActivityAt, '2026-03-22T11:00:00.000Z');
});
