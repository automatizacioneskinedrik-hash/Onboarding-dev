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

const loadCourseFromFirestore = async (datapointId) => {
    const [moduleDoc, topicDoc] = await Promise.all([readModuleById(datapointId), readTopicById(datapointId)]);

    if (moduleDoc) {
        const moduleTopics = await readTopicsByModuleId(moduleDoc.id);

        return {
            id: moduleDoc.id,
            contentType: 'learning_module',
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
                `Tipo: ${course.contentType === 'learning_module' ? 'Módulo' : 'Tema'}`,
                `Título: ${course.title}`,
                `Módulo relacionado: ${course.moduleTitle}`,
                `Distancia vectorial: ${course.distance ?? 'n/a'}`,
            ];

            if (course.description) {
                lines.push(`Descripción: ${course.description}`);
            }

            if (course.difficulty) {
                lines.push(`Dificultad: ${course.difficulty}/4`);
            }

            if (course.estimatedHours) {
                lines.push(`Horas estimadas: ${course.estimatedHours}`);
            }

            if (course.topics.length) {
                lines.push(`Topics del módulo: ${course.topics.join(', ')}`);
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

module.exports = {
    buildProfileRetrievalQuery,
    retrieveRelevantCourses,
    retrieveRelevantCoursesForProfile,
    formatRetrievedCoursesContext,
};
