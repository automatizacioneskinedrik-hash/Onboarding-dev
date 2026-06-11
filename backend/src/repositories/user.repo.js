const createUserRepository = ({ implementation }) => ({
    findByEmail: (...args) => implementation.findByEmail(...args),
    findById: (...args) => implementation.findById(...args),
    create: (...args) => implementation.create(...args),
    update: (...args) => implementation.update(...args),
    verifyPassword: (...args) => implementation.verifyPassword(...args),
    safe: (...args) => implementation.safe(...args),
});

module.exports = {
    createUserRepository,
};
