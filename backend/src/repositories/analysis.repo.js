const createAnalysisRepository = ({ implementation }) => ({
    findByUserId: (...args) => implementation.findByUserId(...args),
    findLatestCompleted: (...args) => implementation.findLatestCompleted(...args),
    findById: (...args) => implementation.findById(...args),
    create: (...args) => implementation.create(...args),
    update: (...args) => implementation.update(...args),
});

module.exports = {
    createAnalysisRepository,
};
