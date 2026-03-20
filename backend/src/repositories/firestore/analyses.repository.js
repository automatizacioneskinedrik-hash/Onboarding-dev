const { v4: uuidv4 } = require('uuid');

const { createFirestoreClient } = require('../../infra/firestore.client');
const { createLogger } = require('../../services/observability/logger');

const logger = createLogger({ component: 'repository.firestore.analyses' });
const { db, collections: COLLECTIONS } = createFirestoreClient();

const analyses = {
    findByUserId: async (userId) => {
        try {
            const snapshot = await db.collection(COLLECTIONS.ANALYSES)
                .where('userId', '==', userId)
                .get();

            const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            logger.error('Error buscando analisis del usuario', {
                userId,
                error: error.message,
            });
            throw error;
        }
    },

    findLatestCompleted: async (userId) => {
        try {
            const snapshot = await db.collection(COLLECTIONS.ANALYSES)
                .where('userId', '==', userId)
                .where('status', '==', 'completed')
                .get();

            if (snapshot.empty) return null;

            const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return items[0];
        } catch (error) {
            logger.error('Error buscando ultimo analisis completado', {
                userId,
                error: error.message,
            });
            throw error;
        }
    },

    findById: async (id) => {
        const doc = await db.collection(COLLECTIONS.ANALYSES).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },

    create: async (data) => {
        const id = uuidv4();
        const analysis = {
            userId: data.userId,
            sourceType: data.sourceType,
            masterId: data.masterId || null,
            file: data.file || null,
            linkedinUrl: data.linkedinUrl || null,
            rawText: data.rawText || null,
            extractedProfile: null,
            recommendation: null,
            status: 'pending',
            errorMessage: null,
            processedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await db.collection(COLLECTIONS.ANALYSES).doc(id).set(analysis);
        return { id, ...analysis };
    },

    update: async (id, fields) => {
        await db.collection(COLLECTIONS.ANALYSES).doc(id).update({
            ...fields,
            updatedAt: new Date().toISOString(),
        });

        return analyses.findById(id);
    },
};

module.exports = analyses;
