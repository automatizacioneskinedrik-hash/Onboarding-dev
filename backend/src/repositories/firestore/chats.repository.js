const { v4: uuidv4 } = require('uuid');

const { createFirestoreClient } = require('../../infra/firestore.client');
const { createLogger } = require('../../services/observability/logger');

const logger = createLogger({ component: 'repository.firestore.chats' });
const { db, collections: COLLECTIONS, admin } = createFirestoreClient();

const chats = {
    findByUserId: async (userId, { page = 1, limit = 20 } = {}) => {
        try {
            const query = db.collection(COLLECTIONS.CHATS)
                .where('userId', '==', userId)
                .where('isActive', '==', true);

            const snapshot = await query.get();
            const total = snapshot.size;
            const skip = (page - 1) * limit;

            const allDocs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            allDocs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            const items = allDocs.slice(skip, skip + limit).map((data) => ({
                id: data.id,
                title: data.title,
                messageCount: data.messageCount || 0,
                finalRecommendation: data.finalRecommendation,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            }));

            return { items, total };
        } catch (error) {
            logger.error('Error buscando chats del usuario', {
                userId,
                error: error.message,
            });
            throw error;
        }
    },

    findById: async (id) => {
        try {
            const doc = await db.collection(COLLECTIONS.CHATS).doc(id).get();
            if (!doc.exists) return null;

            const messagesSnapshot = await db.collection(COLLECTIONS.CHATS)
                .doc(id)
                .collection(COLLECTIONS.MESSAGES)
                .orderBy('timestamp', 'asc')
                .get();

            const messages = messagesSnapshot.docs.map((message) => ({ id: message.id, ...message.data() }));

            return { id: doc.id, ...doc.data(), messages };
        } catch (error) {
            logger.error('Error buscando chat por id', {
                chatId: id,
                error: error.message,
            });
            throw error;
        }
    },

    findByIdAndUser: async (id, userId) => {
        const chat = await chats.findById(id);
        return chat && chat.userId === userId && chat.isActive ? chat : null;
    },

    create: async ({ userId, title = 'Nueva conversacion', cvAnalysisId = null }) => {
        const id = uuidv4();
        const chat = {
            userId,
            title,
            cvAnalysisId,
            linkedinUrl: null,
            finalRecommendation: {
                specialization: null,
                sprintUrl: null,
                subjects: [],
                matchScore: null,
            },
            isActive: true,
            titleGenerated: false,
            messageCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await db.collection(COLLECTIONS.CHATS).doc(id).set(chat);
        return { id, ...chat, messages: [] };
    },

    addMessage: async (chatId, message) => {
        const msgId = uuidv4();
        const payload = {
            ...message,
            timestamp: new Date().toISOString(),
        };

        const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);
        const batch = db.batch();

        batch.set(chatRef.collection(COLLECTIONS.MESSAGES).doc(msgId), payload);
        batch.update(chatRef, {
            updatedAt: new Date().toISOString(),
            messageCount: admin.firestore.FieldValue.increment(1),
        });

        await batch.commit();
        return { id: msgId, ...payload };
    },

    update: async (id, fields) => {
        await db.collection(COLLECTIONS.CHATS).doc(id).update({
            ...fields,
            updatedAt: new Date().toISOString(),
        });

        return chats.findById(id);
    },

    softDelete: async (id, userId) => {
        const chat = await db.collection(COLLECTIONS.CHATS).doc(id).get();

        if (!chat.exists || chat.data().userId !== userId) {
            return false;
        }

        await db.collection(COLLECTIONS.CHATS).doc(id).update({
            isActive: false,
            updatedAt: new Date().toISOString(),
        });

        return true;
    },
};

module.exports = chats;
