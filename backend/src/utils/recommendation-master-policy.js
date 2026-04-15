const MTECH_MBA_MASTER_ID = 'mtecmba';
const DATALAR_MASTER_ID = 'datalar-mba';

const normalizeMasterId = (masterId = null) => {
    if (typeof masterId !== 'string') {
        return null;
    }

    const normalized = masterId.trim().toLowerCase();
    return normalized || null;
};

const resolveRecommendationMasterId = (masterId = null) => {
    const normalizedMasterId = normalizeMasterId(masterId);

    if (normalizedMasterId === MTECH_MBA_MASTER_ID) {
        return DATALAR_MASTER_ID;
    }

    return normalizedMasterId;
};

module.exports = {
    MTECH_MBA_MASTER_ID,
    DATALAR_MASTER_ID,
    resolveRecommendationMasterId,
};
