const { v4: uuidv4 } = require('uuid');

const db = new Map();

const chats = {
    _db: db,

    findByUserId: (userId, { page = 1, limit = 20 } = {}) => {
        const all = [...db.values()]
            .filter((chat) => chat.userId === userId && chat.isActive)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        const total = all.length;
        const skip = (page - 1) * limit;
        const items = all.slice(skip, skip + limit).map((chat) => ({
            id: chat.id,
            title: chat.title,
            masterId: chat.masterId || null,
            cvAnalysisId: chat.cvAnalysisId || null,
            messageCount: chat.messages.length,
            finalRecommendation: chat.finalRecommendation,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
        }));

        return { items, total };
    },

    findById: (id) => db.get(id) || null,

    findByIdAndUser: (id, userId) => {
        const chat = db.get(id);
        return chat && chat.userId === userId && chat.isActive ? chat : null;
    },

    create: ({ userId, title = 'Nueva conversacion', cvAnalysisId = null, masterId = null }) => {
        const chat = {
            id: uuidv4(),
            userId,
            title,
            messages: [],
            cvAnalysisId,
            masterId,
            linkedinUrl: null,
            finalRecommendation: {
                specialization: null,
                sprintUrl: null,
                subjects: [],
                matchScore: null,
            },
            isActive: true,
            titleGenerated: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        db.set(chat.id, chat);
        return chat;
    },

    addMessage: (chatId, message) => {
        const chat = db.get(chatId);
        if (!chat) return null;

        const payload = {
            id: uuidv4(),
            ...message,
            timestamp: new Date().toISOString(),
        };

        chat.messages.push(payload);
        chat.updatedAt = new Date().toISOString();
        db.set(chatId, chat);
        return payload;
    },

    update: (id, fields) => {
        const chat = db.get(id);
        if (!chat) return null;

        const updated = { ...chat, ...fields, updatedAt: new Date().toISOString() };
        db.set(id, updated);
        return updated;
    },

    softDelete: (id, userId) => {
        const chat = db.get(id);
        if (!chat || chat.userId !== userId) return false;

        db.set(id, {
            ...chat,
            isActive: false,
            updatedAt: new Date().toISOString(),
        });

        return true;
    },
};

module.exports = chats;
