const { db, COLLECTIONS } = require('../../config/firebase');

const stats = {
    chatCountByUser: async (userId) => {
        const snapshot = await db.collection(COLLECTIONS.CHATS)
            .where('userId', '==', userId)
            .where('isActive', '==', true)
            .get();

        return snapshot.size;
    },

    analysisCountByUser: async (userId) => {
        const snapshot = await db.collection(COLLECTIONS.ANALYSES)
            .where('userId', '==', userId)
            .where('status', '==', 'completed')
            .get();

        return snapshot.size;
    },
};

module.exports = stats;
