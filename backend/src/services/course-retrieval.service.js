const { db, COLLECTIONS } = require('../config/firebase');
const { createTextEmbedding } = require('./embedding.service');
const { findNeighbors } = require('./vertex-vector-search.service');

const readModuleById = async (id) => {
    const doc = await db.collection(COLLECTIONS.LEARNING_MODULES).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

const readTopicById = async (id) => {
    const doc = await db.collection(COLLECTIONS.TOPICS).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

const readTopicsByModuleId = async (moduleId) => {
    const snapshot = await db.collection(COLLECTIONS.TOPICS).where('module_id', '==', moduleId).get();

    return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
};

const readSprintModuleBySpecialization = async ({ masterId, specializationId }) => {
    if (!masterId || !specializationId) {
        return null;
    }

    const snapshot = await db
        .collection(COLLECTIONS.LEARNING_MODULES)
        .where('master_id', '==', masterId)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs.find(
        (item) =>
            item.data().catalog_type === 'sprint' && item.data().specialization_id === specializationId
    );

    if (!doc) {
        return null;
    }

    return { id: doc.id, ...doc.data() };
};

const loadCourseFromFirestore = async (datapointId) => {
    const [moduleDoc, topicDoc] = await Promise.all([readModuleById(datapointId), readTopicById(datapointId)]);

    if (moduleDoc) {
        const moduleTopics = await readTopicsByModuleId(moduleDoc.id);

        return {
            id: moduleDoc.id,
            contentType: 'learning_module',
            catalogType: moduleDoc.catalog_type || 'master',
            masterId: moduleDoc.master_id || 'shared',
            specializationId: moduleDoc.specialization_id || null,
            title: moduleDoc.title,
            description: moduleDoc.description || '',
            moduleId: moduleDoc.id,
            moduleTitle: moduleDoc.title,
            difficulty: moduleDoc.difficulty || null,
            estimatedHours: moduleDoc.estimated_hours || null,
            order: moduleDoc.order || null,
            topics: moduleTopics.map((topic) => topic.title),
        };
    }

    if (topicDoc) {
        const parentModule = await readModuleById(topicDoc.module_id);

        return {
            id: topicDoc.id,
            contentType: 'topic',
            catalogType: topicDoc.catalog_type || parentModule?.catalog_type || 'master',
            masterId: topicDoc.master_id || parentModule?.master_id || 'shared',
            specializationId: topicDoc.specialization_id || parentModule?.specialization_id || null,
            title: topicDoc.title,
            description: parentModule?.description || '',
            moduleId: topicDoc.module_id,
            moduleTitle: parentModule?.title || topicDoc.module_id,
            difficulty: parentModule?.difficulty || null,
            estimatedHours: parentModule?.estimated_hours || null,
            order: topicDoc.order || null,
            topics: [],
        };
    }

    return null;
};

const formatRetrievedCoursesContext = (courses = []) => {
    if (!courses.length) {
        return '';
    }

    return courses
        .map((course, index) => {
            const lines = [
                `Resultado ${index + 1}:`,
                `Tipo: ${course.contentType === 'learning_module' ? 'Modulo' : 'Tema'}`,
                `Categoria: ${course.catalogType === 'master' ? 'Master' : 'Sprint'}`,
                `Titulo: ${course.title}`,
                `Modulo relacionado: ${course.moduleTitle}`,
                `Distancia vectorial: ${course.distance ?? 'n/a'}`,
            ];

            if (course.description) {
                lines.push(`Descripcion: ${course.description}`);
            }

            if (course.difficulty) {
                lines.push(`Dificultad: ${course.difficulty}/4`);
            }

            if (course.estimatedHours) {
                lines.push(`Horas estimadas: ${course.estimatedHours}`);
            }

            if (course.topics.length) {
                lines.push(`Topics del modulo: ${course.topics.join(', ')}`);
            }

            return lines.join('\n');
        })
        .join('\n\n');
};

const buildProfileRetrievalQuery = (profile = {}) =>
    [
        `Rol actual: ${profile.currentRole || 'No especificado'}`,
        `Industria: ${profile.industry || 'No especificada'}`,
        `Anos de experiencia: ${profile.yearsOfExperience || 'No especificado'}`,
        `Habilidades: ${(profile.skills || []).join(', ') || 'No especificadas'}`,
        `Resumen: ${profile.summary || 'No disponible'}`,
    ]
        .filter(Boolean)
        .join('. ');

const buildModuleRanking = (matches = []) => {
    const ranking = new Map();

    matches.forEach((match, index) => {
        const score = Math.max(1, matches.length - index) + (match.contentType === 'learning_module' ? 1.5 : 0.75);
        const current = ranking.get(match.moduleId) || {
            moduleId: match.moduleId,
            moduleTitle: match.moduleTitle,
            specializationId: match.specializationId || null,
            score: 0,
            hits: 0,
            topMatch: match,
        };

        current.score += score;
        current.hits += 1;
        if (!current.topMatch || index === 0) {
            current.topMatch = match;
        }

        ranking.set(match.moduleId, current);
    });

    return [...ranking.values()].sort((a, b) => b.score - a.score);
};

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

const loadSprintCatalogForSpecialization = async ({ masterId, specializationId }) => {
    const moduleDoc = await readSprintModuleBySpecialization({ masterId, specializationId });

    if (!moduleDoc) {
        return null;
    }

    const moduleTopics = await readTopicsByModuleId(moduleDoc.id);

    return {
        id: moduleDoc.id,
        masterId: moduleDoc.master_id || masterId,
        specializationId: moduleDoc.specialization_id || specializationId,
        title: moduleDoc.title,
        description: moduleDoc.description || '',
        difficulty: moduleDoc.difficulty || null,
        estimatedHours: moduleDoc.estimated_hours || null,
        topics: moduleTopics.map((topic) => topic.title),
    };
};

module.exports = {
    buildProfileRetrievalQuery,
    retrieveRelevantCourses,
    retrieveRelevantCoursesForProfile,
    formatRetrievedCoursesContext,
    loadSprintCatalogForSpecialization,
};
