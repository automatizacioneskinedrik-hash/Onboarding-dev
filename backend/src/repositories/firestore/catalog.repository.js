const { createFirestoreClient } = require('../../infra/firestore.client');

const { db, collections: COLLECTIONS } = createFirestoreClient();

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

const readSprintModulesByMasterId = async (masterId) => {
    if (!masterId) {
        return [];
    }

    const snapshot = await db.collection(COLLECTIONS.LEARNING_MODULES).where('master_id', '==', masterId).get();

    return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((module) => module.catalog_type === 'sprint')
        .sort((a, b) => (a.order || 0) - (b.order || 0));
};

const readMasterModulesByMasterId = async (masterId) => {
    if (!masterId) {
        return [];
    }

    const snapshot = await db.collection(COLLECTIONS.LEARNING_MODULES).where('master_id', '==', masterId).get();

    return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((module) => module.catalog_type === 'master')
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
    readModuleById,
    readTopicById,
    readTopicsByModuleId,
    readMasterModulesByMasterId,
    readSprintModulesByMasterId,
    readSprintModuleBySpecialization,
    loadCourseFromFirestore,
    loadSprintCatalogForSpecialization,
};
