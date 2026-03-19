const { openai, OPENAI_MODEL } = require('../../config/openai');
const {
    getSpecializationById,
    getSpecializationNamesForPrompt,
} = require('../../utils/specializations');
const {
    retrieveRelevantCoursesForProfile,
    loadSprintCatalogForSpecialization,
    buildMasterCatalogFallbackRetrieval,
} = require('../course-retrieval.service');
const {
    resolveSpecializationIdFromMatch,
    pickFallbackSpecialization,
    buildRetrievedCatalogContext,
    buildRecommendationFromRetrievalFallback,
} = require('./ai-fallbacks.service');
const { buildRecommendationPrompt } = require('./prompts/recommendation-generation.prompt');

const resolveSpecializationCatalog = async ({ masterId, specializationId, fallbackSpecialization }) => {
    const sprintCatalog = masterId
        ? await loadSprintCatalogForSpecialization({ masterId, specializationId })
        : null;

    return {
        specialization: fallbackSpecialization,
        subjects: sprintCatalog?.topics?.length ? sprintCatalog.topics : fallbackSpecialization.subjects,
        sprintTitle: sprintCatalog?.title || fallbackSpecialization.name,
        sprintUrl: fallbackSpecialization.sprintUrl,
        sprintCatalog,
    };
};

const generateRecommendation = async ({
    profile,
    sourceType = 'pdf',
    options = {},
    logger,
    ensureConfigured,
}) => {
    if (!openai) {
        const specialization = pickFallbackSpecialization(profile);
        let fallbackRetrieval = null;

        if (options.masterId) {
            try {
                fallbackRetrieval = await buildMasterCatalogFallbackRetrieval(profile, {
                    masterId: options.masterId,
                    topK: 3,
                });
            } catch (fallbackError) {
                logger?.warn('Fallback de catalogo omitido', {
                    masterId: options.masterId,
                    error: fallbackError.message,
                });
            }
        }

        const specializationCatalog = await resolveSpecializationCatalog({
            masterId: options.masterId,
            specializationId: specialization.id,
            fallbackSpecialization: specialization,
        });

        logger?.info('Recomendacion generada con fallback local', {
            sourceType,
            masterId: options.masterId || null,
            specializationId: specialization.id,
            matchCount: fallbackRetrieval?.matches?.length || 0,
        });

        return {
            primarySpecialization: specialization.name,
            primarySpecializationId: specialization.id,
            secondarySpecializations: [],
            matchScore: 78,
            reasoning: `Se recomienda ${specialization.name} con base en las senales detectadas en tu perfil. Esta recomendacion fue generada en modo de respaldo.`,
            keyStrengths: (profile.skills || []).slice(0, 3),
            growthAreas: ['Profundizacion tecnica', 'Liderazgo estrategico'],
            specialization: specializationCatalog.specialization,
            subjects: specializationCatalog.subjects,
            sprintUrl: specializationCatalog.sprintUrl,
            recommendedCourses: (fallbackRetrieval?.matches || []).slice(0, 3).map((match) => ({
                id: match.id,
                title: match.title,
                contentType: match.contentType,
                moduleId: match.moduleId,
                specializationId: match.specializationId || null,
                moduleTitle: match.moduleTitle,
                distance: match.distance,
            })),
        };
    }

    ensureConfigured();

    let retrieval = null;
    try {
        const masterFilters = options.masterId
            ? {
                masterIds: [options.masterId],
                catalogTypes: ['sprint'],
            }
            : { catalogTypes: ['sprint'] };

        retrieval = await retrieveRelevantCoursesForProfile(profile, {
            topK: 6,
            filters: masterFilters,
        });
    } catch (retrievalError) {
        logger?.warn('Busqueda vectorial omitida para recomendacion', {
            masterId: options.masterId,
            error: retrievalError.message,
        });
    }

    if ((!retrieval || !retrieval.matches?.length) && options.masterId) {
        try {
            retrieval = await buildMasterCatalogFallbackRetrieval(profile, {
                masterId: options.masterId,
                topK: 6,
            });
        } catch (fallbackError) {
            logger?.warn('Fallback de catalogo omitido', {
                masterId: options.masterId,
                error: fallbackError.message,
            });
        }
    }

    const retrievalFallback = buildRecommendationFromRetrievalFallback(profile, retrieval);
    const preferredSpecializationId = retrievalFallback.primarySpecializationId;
    const retrievedCatalogContext = buildRetrievedCatalogContext(retrieval);
    const prompt = buildRecommendationPrompt({
        profile,
        options,
        retrievedCatalogContext,
        retrieval,
        preferredSpecializationId,
        specializationsList: getSpecializationNamesForPrompt(),
        resolveSpecializationIdFromMatch,
    });

    try {
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(response.choices[0].message.content);
        const resolvedPrimarySpecializationId =
            getSpecializationById(result.primarySpecializationId)?.id ||
            resolveSpecializationIdFromMatch(retrieval?.moduleRanking?.[0]) ||
            retrievalFallback.primarySpecializationId;
        const specialization = getSpecializationById(resolvedPrimarySpecializationId) || retrievalFallback.specialization;
        const specializationCatalog = await resolveSpecializationCatalog({
            masterId: options.masterId,
            specializationId: resolvedPrimarySpecializationId,
            fallbackSpecialization: specialization,
        });

        logger?.info('Recomendacion generada', {
            model: OPENAI_MODEL,
            sourceType,
            masterId: options.masterId || null,
            specializationId: resolvedPrimarySpecializationId,
            matchCount: retrieval?.matches?.length || 0,
        });

        return {
            ...result,
            primarySpecializationId: resolvedPrimarySpecializationId,
            primarySpecialization: specializationCatalog.specialization.name,
            specialization: specializationCatalog.specialization,
            subjects: specializationCatalog.subjects,
            sprintUrl: specializationCatalog.sprintUrl,
            recommendedCourses: retrievalFallback.recommendedCourses,
        };
    } catch (error) {
        logger?.warn('Respuesta IA invalida, usando fallback', {
            masterId: options.masterId,
            error: error.message,
        });

        const specializationCatalog = await resolveSpecializationCatalog({
            masterId: options.masterId,
            specializationId: retrievalFallback.primarySpecializationId,
            fallbackSpecialization: retrievalFallback.specialization,
        });

        logger?.info('Recomendacion generada con fallback de retrieval', {
            sourceType,
            masterId: options.masterId || null,
            specializationId: retrievalFallback.primarySpecializationId,
            matchCount: retrieval?.matches?.length || 0,
        });

        return {
            ...retrievalFallback,
            primarySpecialization: specializationCatalog.specialization.name,
            specialization: specializationCatalog.specialization,
            subjects: specializationCatalog.subjects,
            sprintUrl: specializationCatalog.sprintUrl,
        };
    }
};

module.exports = {
    generateRecommendation,
    resolveSpecializationCatalog,
};
