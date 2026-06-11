const { getAllMasters, getMasterById, isValidMasterId } = require('../utils/masters');

const createMasterRepository = () => ({
    getAll: () => getAllMasters(),
    getById: (id) => getMasterById(id),
    isValid: (id) => isValidMasterId(id),
});

module.exports = {
    createMasterRepository,
};
