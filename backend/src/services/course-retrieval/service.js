const { createLogger } = require('../../logging/logger');
const { createTextEmbedding } = require('../embedding.service');
const { findNeighbors } = require('../vertex-vector-search.service');
const {
    readTopicsByModuleId,
    readSprintModulesByMasterId,
    loadCourseFromFirestore,
    loadSprintCatalogForSpecialization,
} = require('./catalog-repository');
const { buildProfileRetrievalQuery } = require('./profile-query-builder');
const { formatRetrievedCoursesContext } = require('./retrieval-context-builder');
const {
    extractSearchTerms,
    scoreModuleAgainstProfile,
    buildModuleRanking,
} = require('./retrieval-ranking');

const logger = createLogger({ component: 'service.course-retrieval' });

const retrieveRelevantCourses = async ({
    question,
    embeddingResult = null,
    topK = 4,
    filters = {},
} = {}) => {
    const normalizedQuestion = String(question || '').trim();

    if (!normalizedQuestion) {
        throw new Error('Question is required to retrieve relevant courses.');
    }

    const queryEmbedding = embeddingResult || (await createTextEmbedding(normalizedQuestion));
    const vectorResult = await findNeighbors({
        embedding: queryEmbedding.embedding,
        topK,
        filters,
    });

    const matches = await Promise.all(
        vectorResult.neighbors.map(async (neighbor) => {
            const course = await loadCourseFromFirestore(neighbor.datapointId);

            if (!course) {
                return null;
            }

            return {
                ...course,
                distance: neighbor.distance,
                sparseDistance: neighbor.sparseDistance,
            };
        })
    );

    const validMatches = matches.filter(Boolean);

    logger.info('Cursos recuperados', {
        topK,
        filters: Object.keys(filters || {}),
        matchCount: validMatches.length,
        neighborCount: vectorResult.neighbors.length,
    });

    return {
        queryEmbedding,
        matches: validMatches,
        contextText: formatRetrievedCoursesContext(validMatches),
        moduleRanking: buildModuleRanking(validMatches),
        vectorSearch: {
            endpointName: vectorResult.endpointName,
            deployedIndexId: vectorResult.deployedIndexId,
            publicEndpointDomain: vectorResult.publicEndpointDomain,
            rawMatchCount: vectorResult.neighbors.length,
        },
    };
};

const retrieveRelevantCoursesForProfile = async (profile, options = {}) => {
    const profileQuery = buildProfileRetrievalQuery(profile);
    const retrieval = await retrieveRelevantCourses({
        question: profileQuery,
        topK: options.topK || 6,
        filters: options.filters || {},
    });

    return {
        ...retrieval,
        profileQuery,
    };
};

const buildMasterCatalogFallbackRetrieval = async (profile, { masterId, topK = 6 } = {}) => {
    const profileQuery = buildProfileRetrievalQuery(profile);
    const profileTerms = extractSearchTerms(profileQuery);
    const sprintModules = await readSprintModulesByMasterId(masterId);

    if (!sprintModules.length) {
        logger.warn('Sin sprints para fallback de catalogo', {
            masterId,
        });
        return {
            profileQuery,
            matches: [],
            contextText: '',
            moduleRanking: [],
            vectorSearch: {
                endpointName: null,
                deployedIndexId: null,
                publicEndpointDomain: null,
                rawMatchCount: 0,
                source: 'firestore_catalog_fallback',
            },
        };
    }

    const modulesWithTopics = await Promise.all(
        sprintModules.map(async (module) => ({
            ...module,
            topics: (await readTopicsByModuleId(module.id)).map((topic) => topic.title),
        }))
    );

    const rankedMatches = modulesWithTopics
        .map((module) => {
            const fallbackScore = scoreModuleAgainstProfile(module, profileTerms);

            return {
                id: module.id,
                contentType: 'learning_module',
                catalogType: module.catalog_type || 'sprint',
                masterId: module.master_id || masterId,
                specializationId: module.specialization_id || null,
                title: module.title,
                description: module.description || '',
                moduleId: module.id,
                moduleTitle: module.title,
                difficulty: module.difficulty || null,
                estimatedHours: module.estimated_hours || null,
                order: module.order || null,
                topics: module.topics || [],
                distance: Number((1 / (fallbackScore + 1)).toFixed(4)),
                fallbackScore,
            };
        })
        .sort((a, b) => {
            if ((b.fallbackScore || 0) !== (a.fallbackScore || 0)) {
                return (b.fallbackScore || 0) - (a.fallbackScore || 0);
            }
            if ((a.order || 0) !== (b.order || 0)) {
                return (a.order || 0) - (b.order || 0);
            }
            return String(a.id).localeCompare(String(b.id));
        })
        .slice(0, topK)
        .map(({ fallbackScore, ...match }) => match);

    logger.info('Fallback de catalogo completado', {
        masterId,
        topK,
        matchCount: rankedMatches.length,
    });

    return {
        profileQuery,
        matches: rankedMatches,
        contextText: formatRetrievedCoursesContext(rankedMatches),
        moduleRanking: buildModuleRanking(rankedMatches),
        vectorSearch: {
            endpointName: null,
            deployedIndexId: null,
            publicEndpointDomain: null,
            rawMatchCount: 0,
            source: 'firestore_catalog_fallback',
        },
    };
};

module.exports = {
    buildProfileRetrievalQuery,
    retrieveRelevantCourses,
    retrieveRelevantCoursesForProfile,
    formatRetrievedCoursesContext,
    loadSprintCatalogForSpecialization,
    buildMasterCatalogFallbackRetrieval,
};
