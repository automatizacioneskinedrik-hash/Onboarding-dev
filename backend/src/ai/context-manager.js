const { createLogger } = require('../services/observability/logger');
const { buildProfileRetrievalQuery } = require('./profile-query-builder');
const { formatRetrievedCoursesContext } = require('./retrieval-context-builder');
const {
    extractSearchTerms,
    scoreModuleAgainstProfile,
    buildModuleRanking,
} = require('./retrieval-ranking');

const createContextManager = ({
    openAiClient,
    vertexClient,
    catalogRepo,
    logger = createLogger({ component: 'ai.context-manager' }),
}) => {
    // Compacta espacios para estabilizar embeddings y evitar que saltos de linea o pegados
    // con formato irregular alteren innecesariamente la vectorizacion.
    const normalizeTextForEmbedding = (text = '') => String(text).replace(/\s+/g, ' ').trim();

    // Devuelve metadata junto al vector porque el resto del pipeline la reutiliza en logs
    // y para no recalcular embeddings ya generados.
    const createTextEmbedding = async (text) => {
        const normalizedText = normalizeTextForEmbedding(text);

        if (!normalizedText) {
            const error = new Error('Cannot create embedding for empty text.');
            error.statusCode = 400;
            throw error;
        }

        openAiClient.ensureConfigured();

        const response = await openAiClient.createEmbedding(normalizedText);
        const embedding = response.data?.[0]?.embedding;

        if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error('Embedding generation returned an empty vector.');
        }

        logger.debug('Embedding generado', {
            model: openAiClient.getEmbeddingModel(),
            dimensions: embedding.length,
            inputLength: normalizedText.length,
        });

        return {
            embedding,
            model: openAiClient.getEmbeddingModel(),
            dimensions: embedding.length,
        };
    };

    // Une la busqueda vectorial con el catalogo interno: Vertex encuentra vecinos y el
    // repositorio reconstruye el contenido enriquecido que luego consumen prompts y respuestas.
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
        const vectorResult = await vertexClient.findNeighbors({
            embedding: queryEmbedding.embedding,
            topK,
            filters,
        });

        const matches = await Promise.all(
            vectorResult.neighbors.map(async (neighbor) => {
                const course = await catalogRepo.loadCourseByDatapointId(neighbor.datapointId);

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

    // Reutiliza el mismo retrieval, pero construyendo antes una query orientada al perfil
    // del usuario en vez de una pregunta libre.
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

    // Este fallback evita dejar sin contexto al recomendador cuando Vertex no esta disponible
    // o aun no existe indice para el master solicitado.
    const buildMasterCatalogFallbackRetrieval = async (profile, { masterId, topK = 6 } = {}) => {
        const profileQuery = buildProfileRetrievalQuery(profile);
        const profileTerms = extractSearchTerms(profileQuery);
        const sprintModules = await catalogRepo.readSprintModulesByMasterId(masterId);

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
                topics: (await catalogRepo.readTopicsByModuleId(module.id)).map((topic) => topic.title),
            }))
        );

        const rankedMatches = modulesWithTopics
            .map((module) => {
                // Generamos una distancia sintetica para conservar el mismo contrato que el
                // retrieval vectorial y no ramificar consumidores aguas abajo.
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

    return {
        normalizeTextForEmbedding,
        createTextEmbedding,
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
