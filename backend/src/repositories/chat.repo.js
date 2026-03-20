const createChatRepository = ({ implementation }) => ({
    findByUserId: (...args) => implementation.findByUserId(...args),
    findById: (...args) => implementation.findById(...args),
    findByIdAndUser: (...args) => implementation.findByIdAndUser(...args),
    create: (...args) => implementation.create(...args),
    addMessage: (...args) => implementation.addMessage(...args),
    update: (...args) => implementation.update(...args),
    softDelete: (...args) => implementation.softDelete(...args),
});

module.exports = {
    createChatRepository,
};
