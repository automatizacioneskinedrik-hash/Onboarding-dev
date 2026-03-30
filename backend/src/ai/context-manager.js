const { createLogger } = require('../services/observability/logger');
const { buildProfileRetrievalQuery } = require('./profile-query-builder');
const { formatRetrievedCoursesContext } = require('./retrieval-context-builder');
const {
    extractSearchTerms,
    scoreModuleAgainstProfile,
    buildModuleRanking,
} = require('./retrieval-ranking');

const createContextManager = ({
    catalogRepo,
    logger = createLogger({ component: 'ai.context-manager' }),
}) => {
    const buildCatalogRanking = async ({ query, masterId, topK }) => {
        const profileTerms = extractSearchTerms(query);
        const sprintModules = masterId ? await catalogRepo.readSprintModulesByMasterId(masterId) : [];

        if (!sprintModules.length) {
            return [];
        }

        const modulesWithTopics = await Promise.all(
            sprintModules.map(async (module) => ({
                ...module,
                topics: (await catalogRepo.readTopicsByModuleId(module.id)).map((topic) => topic.title),
            }))
        );

        return modulesWithTopics
            .map((module) => {
                const rankingScore = scoreModuleAgainstProfile(module, profileTerms);

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
                    distance: Number((1 / (rankingScore + 1)).toFixed(4)),
                    rankingScore,
                };
            })
            .sort((a, b) => {
                if ((b.rankingScore || 0) !== (a.rankingScore || 0)) {
                    return (b.rankingScore || 0) - (a.rankingScore || 0);
                }
                if ((a.order || 0) !== (b.order || 0)) {
                    return (a.order || 0) - (b.order || 0);
                }
                return String(a.id).localeCompare(String(b.id));
            })
            .slice(0, topK)
            .map(({ rankingScore, ...match }) => match);
    };

    const retrieveRelevantCourses = async ({
        question,
        masterId = null,
        topK = 4,
    } = {}) => {
        const normalizedQuestion = String(question || '').trim();

        if (!normalizedQuestion) {
            throw new Error('Question is required to retrieve relevant courses.');
        }

        const rankedMatches = await buildCatalogRanking({
            query: normalizedQuestion,
            masterId,
            topK,
        });

        logger.info('Cursos recuperados por ranking local', {
            masterId,
            topK,
            matchCount: rankedMatches.length,
        });

        return {
            matches: rankedMatches,
            contextText: formatRetrievedCoursesContext(rankedMatches),
            moduleRanking: buildModuleRanking(rankedMatches),
            vectorSearch: {
                endpointName: null,
                deployedIndexId: null,
                publicEndpointDomain: null,
                rawMatchCount: rankedMatches.length,
                source: 'catalog_ranking',
            },
        };
    };

    const retrieveRelevantCoursesForProfile = async (profile, options = {}) => {
        const profileQuery = buildProfileRetrievalQuery(profile);
        const retrieval = await retrieveRelevantCourses({
            question: profileQuery,
            masterId: options.masterId || null,
            topK: options.topK || 6,
        });

        return {
            ...retrieval,
            profileQuery,
        };
    };

    const buildMasterCatalogFallbackRetrieval = async (profile, { masterId, topK = 6 } = {}) => {
        return retrieveRelevantCoursesForProfile(profile, { masterId, topK });
    };

    return {
        retrieveRelevantCourses,
        retrieveRelevantCoursesForProfile,
        buildProfileRetrievalQuery,
        formatRetrievedCoursesContext,
        loadSprintCatalogForSpecialization: (...args) => catalogRepo.loadSprintCatalogForSpecialization(...args),
        buildMasterCatalogFallbackRetrieval,
    };
};

module.exports = {
    createContextManager,
};
