const {
    buildProfileRetrievalQuery,
    retrieveRelevantCourses,
    retrieveRelevantCoursesForProfile,
    formatRetrievedCoursesContext,
    loadSprintCatalogForSpecialization,
    buildMasterCatalogFallbackRetrieval,
} = require('./course-retrieval/service');

module.exports = {
    buildProfileRetrievalQuery,
    retrieveRelevantCourses,
    retrieveRelevantCoursesForProfile,
    formatRetrievedCoursesContext,
    loadSprintCatalogForSpecialization,
    buildMasterCatalogFallbackRetrieval,
};
