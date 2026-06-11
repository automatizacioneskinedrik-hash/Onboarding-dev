const createStatsRepository = ({ implementation }) => ({
    chatCountByUser: (...args) => implementation.chatCountByUser(...args),
    analysisCountByUser: (...args) => implementation.analysisCountByUser(...args),
});

module.exports = {
    createStatsRepository,
};
