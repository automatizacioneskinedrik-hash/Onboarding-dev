const serializeAnalysisHistoryItem = (analysis = {}) => {
    const { rawText, ...rest } = analysis;
    return rest;
};

module.exports = {
    serializeAnalysisHistoryItem,
};
