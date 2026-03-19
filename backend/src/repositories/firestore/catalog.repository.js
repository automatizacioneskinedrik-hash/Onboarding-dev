const { db, COLLECTIONS } = require('../../config/firebase');

const sortByOrder = (items = []) =>
    [...items].sort((a, b) => {
        if ((a.order || 0) !== (b.order || 0)) {
            return (a.order || 0) - (b.order || 0);
        }

        return String(a.id).localeCompare(String(b.id));
    });

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
    return sortByOrder(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
};

const readSprintModulesByMasterId = async (masterId) => {
    if (!masterId) {
        return [];
    }

    const snapshot = await db.collection(COLLECTIONS.LEARNING_MODULES).where('master_id', '==', masterId).get();
    return sortByOrder(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
        .filter((module) => module.catalog_type === 'sprint');
};

const readSprintModuleBySpecialization = async ({ masterId, specializationId }) => {
    if (!masterId || !specializationId) {
        return null;
    }

    const snapshot = await db.collection(COLLECTIONS.LEARNING_MODULES)
        .where('master_id', '==', masterId)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs.find(
        (item) => item.data().catalog_type === 'sprint' && item.data().specialization_id === specializationId
    );

    return doc ? { id: doc.id, ...doc.data() } : null;
};

module.exports = {
    readModuleById,
    readTopicById,
    readTopicsByModuleId,
    readSprintModulesByMasterId,
    readSprintModuleBySpecialization,
};
