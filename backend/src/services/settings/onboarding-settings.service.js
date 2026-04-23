const DEFAULT_MAX_CHAT_INTERACTIONS = 20;

const DEFAULT_ONBOARDING_SETTINGS = {
    introVideoUrl: null,
    introVideoEnabled: false,
    maxChatInteractions: DEFAULT_MAX_CHAT_INTERACTIONS,
    updatedAt: null,
    updatedBy: null,
};

const SETTINGS_COLLECTION = 'settings';
const ONBOARDING_VIDEO_DOC = 'onboardingVideo';

let memorySettings = { ...DEFAULT_ONBOARDING_SETTINGS };

const resolveUseFirestore = () =>
    process.env.USE_FIRESTORE === 'true' || process.env.NODE_ENV === 'production';

const readOnboardingSettings = async () => {
    if (!resolveUseFirestore()) {
        return { ...memorySettings };
    }

    const { createFirestoreClient } = require('../../infra/firestore.client');
    const { db } = createFirestoreClient();
    const snapshot = await db.collection(SETTINGS_COLLECTION).doc(ONBOARDING_VIDEO_DOC).get();

    if (!snapshot.exists) {
        return { ...DEFAULT_ONBOARDING_SETTINGS };
    }

    return {
        ...DEFAULT_ONBOARDING_SETTINGS,
        ...snapshot.data(),
    };
};

const writeOnboardingSettings = async ({ patch = {}, updatedBy = null } = {}) => {
    const updatePayload = {
        ...patch,
        updatedBy,
        updatedAt: new Date().toISOString(),
    };

    if (!resolveUseFirestore()) {
        memorySettings = {
            ...memorySettings,
            ...updatePayload,
        };

        return { ...memorySettings };
    }

    const { createFirestoreClient } = require('../../infra/firestore.client');
    const { db } = createFirestoreClient();

    await db.collection(SETTINGS_COLLECTION).doc(ONBOARDING_VIDEO_DOC).set(updatePayload, { merge: true });

    return {
        ...DEFAULT_ONBOARDING_SETTINGS,
        ...updatePayload,
    };
};

module.exports = {
    DEFAULT_MAX_CHAT_INTERACTIONS,
    readOnboardingSettings,
    writeOnboardingSettings,
};
