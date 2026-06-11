const createNoopCatalogRepository = () => ({
    readModuleById: async () => null,
    readTopicById: async () => null,
    readTopicsByModuleId: async () => [],
    readMasterModulesByMasterId: async () => [],
    readSprintModulesByMasterId: async () => [],
    readSprintModuleBySpecialization: async () => null,
    loadCourseByDatapointId: async () => null,
    loadSprintCatalogForSpecialization: async () => null,
});

const createCatalogRepository = ({ implementation = null } = {}) => {
    if (!implementation) {
        return createNoopCatalogRepository();
    }

    return {
        readModuleById: (...args) => implementation.readModuleById(...args),
        readTopicById: (...args) => implementation.readTopicById(...args),
        readTopicsByModuleId: (...args) => implementation.readTopicsByModuleId(...args),
        readMasterModulesByMasterId: (...args) => implementation.readMasterModulesByMasterId(...args),
        readSprintModulesByMasterId: (...args) => implementation.readSprintModulesByMasterId(...args),
        readSprintModuleBySpecialization: (...args) => implementation.readSprintModuleBySpecialization(...args),
        loadCourseByDatapointId: (...args) => implementation.loadCourseByDatapointId(...args),
        loadSprintCatalogForSpecialization: (...args) => implementation.loadSprintCatalogForSpecialization(...args),
    };
};

module.exports = {
    createCatalogRepository,
};
