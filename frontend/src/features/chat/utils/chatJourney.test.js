import { describe, expect, it } from 'vitest';
import {
    CHAT_JOURNEY_STAGES,
    getChatEmptyStateCopy,
    resolveChatJourneyStage,
} from './chatJourney';

describe('chatJourney', () => {
    it('returns select master stage when there is no master selected', () => {
        expect(resolveChatJourneyStage()).toBe(CHAT_JOURNEY_STAGES.SELECT_MASTER);
    });

    it('returns upload cv stage when master exists but there is no analysis yet', () => {
        expect(
            resolveChatJourneyStage({
                selectedMaster: { id: 'mtecmba' },
            })
        ).toBe(CHAT_JOURNEY_STAGES.UPLOAD_CV);
    });

    it('returns review recommendation stage when recommendation is available', () => {
        expect(
            resolveChatJourneyStage({
                selectedMaster: { id: 'mtecmba' },
                recommendation: { primarySpecialization: 'Tech MBA' },
            })
        ).toBe(CHAT_JOURNEY_STAGES.REVIEW_RECOMMENDATION);
    });

    it('builds contextual placeholder copy', () => {
        expect(
            getChatEmptyStateCopy({
                stage: CHAT_JOURNEY_STAGES.UPLOAD_CV,
                selectedMasterDisplayName: 'Master Tech MBA',
            }).placeholder
        ).toContain('Master Tech MBA');
    });
});
