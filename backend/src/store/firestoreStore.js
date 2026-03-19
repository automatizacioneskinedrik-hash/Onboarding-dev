/**
 * Firestore Store Implementation
 * Persistence layer using Google Cloud Firestore.
 */

const { db, COLLECTIONS, admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { createLogger } = require('../logging/logger');

const logger = createLogger({ component: 'store.firestore' });

// ─── Password Helpers ─────────────────────────────────────────────────────────
const hashPassword = (password) => {
    if (!password) return null;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

const comparePassword = (password, stored) => {
    if (!stored || !password) return false;

    // Check if password is in "salt:hash" format (Secured)
    if (stored.includes(':')) {
        const [salt, hash] = stored.split(':');
        const inputHash = crypto.scryptSync(password, salt, 64).toString('hex');
        return inputHash === hash;
    }

    // Fallback for plain text passwords (like user123's "123456") - Not recommended for prod
    // This allows the user to log in and then we should ideally update it.
    return password === stored;
};

// ─── User Operations ──────────────────────────────────────────────────────────
const users = {
    findByEmail: async (email) => {
        if (!email) return null;
        try {
            const snapshot = await db.collection(COLLECTIONS.USERS)
                .where('email', '==', email.toLowerCase().trim())
                .limit(1)
                .get();

            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        } catch (error) {
            logger.error('Error buscando usuario por email', {
                error: error.message,
            });
            throw error;
        }
    },

    findById: async (id) => {
        try {
            const doc = await db.collection(COLLECTIONS.USERS).doc(id).get();
            if (!doc.exists) return null;
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            logger.error('Error buscando usuario por id', {
                userId: id,
                error: error.message,
            });
            throw error;
        }
    },

    create: async (userData) => {
        const { name, email, password } = userData;

        // Check if exists first
        const existing = await users.findByEmail(email);
        if (existing) {
            throw new Error('DUPLICATE_EMAIL');
        }

        const id = uuidv4();
        const user = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password ? hashPassword(password) : null,
            role: 'user',
            isActive: true,
            avatar: userData.avatar || null,
            googleId: userData.googleId || null,
            isGoogleAccount: userData.isGoogleAccount || false,
            cvAnalysisId: null,
            selectedMasterId: null,
            linkedinUrl: null,
            recommendedSpecialization: null,
            lastLogin: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...userData,
        };

        // If userData had id, we should keep it or remove it to avoid confusion
        delete user.id;

        await db.collection(COLLECTIONS.USERS).doc(id).set(user);
        return { id, ...user };
    },

    update: async (id, fields) => {
        const data = { ...fields, updatedAt: new Date().toISOString() };

        // If updating password, hash it!
        if (data.password && !data.password.includes(':')) {
            data.password = hashPassword(data.password);
        }

        await db.collection(COLLECTIONS.USERS).doc(id).update(data);
        const updated = await users.findById(id);
        return updated;
    },

    verifyPassword: (user, password) => {
        if (user.isGoogleAccount && !user.password) return false;
        return comparePassword(password, user.password);
    },

    safe: (user) => {
        if (!user) return null;
        const { password, ...safe } = user;
        return safe;
    },
};

// ─── Chat Operations ──────────────────────────────────────────────────────────
const chats = {
    findByUserId: async (userId, { page = 1, limit = 20 } = {}) => {
        try {
            const query = db.collection(COLLECTIONS.CHATS)
                .where('userId', '==', userId)
                .where('isActive', '==', true);

            const snapshot = await query.get();
            const total = snapshot.size;

            const skip = (page - 1) * limit;

            const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allDocs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            const items = allDocs.slice(skip, skip + limit).map(data => {
                return {
                    id: data.id,
                    title: data.title,
                    messageCount: data.messageCount || 0,
                    finalRecommendation: data.finalRecommendation,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                };
            });

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

            const messages = messagesSnapshot.docs.map(m => ({ id: m.id, ...m.data() }));

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

    create: async ({ userId, title = 'Nueva conversación', cvAnalysisId = null }) => {
        const id = uuidv4();
        const chat = {
            userId,
            title,
            cvAnalysisId,
            linkedinUrl: null,
            finalRecommendation: {
                specialization: null,
                springUrl: null,
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
        const msg = {
            ...message,
            timestamp: new Date().toISOString(),
        };

        const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);

        const batch = db.batch();
        batch.set(chatRef.collection(COLLECTIONS.MESSAGES).doc(msgId), msg);
        batch.update(chatRef, {
            updatedAt: new Date().toISOString(),
            messageCount: admin.firestore.FieldValue.increment(1)
        });

        await batch.commit();
        return { id: msgId, ...msg };
    },

    update: async (id, fields) => {
        await db.collection(COLLECTIONS.CHATS).doc(id).update({
            ...fields,
            updatedAt: new Date().toISOString()
        });
        return await chats.findById(id);
    },

    softDelete: async (id, userId) => {
        const chat = await db.collection(COLLECTIONS.CHATS).doc(id).get();
        if (!chat.exists || chat.data().userId !== userId) return false;

        await db.collection(COLLECTIONS.CHATS).doc(id).update({
            isActive: false,
            updatedAt: new Date().toISOString()
        });
        return true;
    },
};

// ─── CV Analysis Operations ───────────────────────────────────────────────────
const analyses = {
    findByUserId: async (userId) => {
        try {
            const snapshot = await db.collection(COLLECTIONS.ANALYSES)
                .where('userId', '==', userId)
                .get();

            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
            sourceType: data.sourceType, // 'pdf' | 'linkedin'
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
            updatedAt: new Date().toISOString()
        });
        return await analyses.findById(id);
    },
};

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

module.exports = { users, chats, analyses, stats };
