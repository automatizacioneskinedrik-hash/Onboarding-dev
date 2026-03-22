const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const {
    buildEmptyJourneyContext,
    normalizeUserJourneyContext,
} = require('../../services/users/user-journey.service');

const { createFirestoreClient } = require('../../infra/firestore.client');
const { createLogger } = require('../../services/observability/logger');

const logger = createLogger({ component: 'repository.firestore.users' });
const { db, collections: COLLECTIONS } = createFirestoreClient();

const hashPassword = (password) => {
    if (!password) return null;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

const comparePassword = (password, stored) => {
    if (!stored || !password) return false;

    if (stored.includes(':')) {
        const [salt, hash] = stored.split(':');
        const inputHash = crypto.scryptSync(password, salt, 64).toString('hex');
        return inputHash === hash;
    }

    return password === stored;
};

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
        user.journeyContext = buildEmptyJourneyContext(user.createdAt);

        delete user.id;

        await db.collection(COLLECTIONS.USERS).doc(id).set(user);
        return { id, ...user };
    },

    update: async (id, fields) => {
        const data = { ...fields, updatedAt: new Date().toISOString() };

        if (data.password && !data.password.includes(':')) {
            data.password = hashPassword(data.password);
        }

        await db.collection(COLLECTIONS.USERS).doc(id).update(data);
        return users.findById(id);
    },

    verifyPassword: (user, password) => {
        if (user.isGoogleAccount && !user.password) return false;
        return comparePassword(password, user.password);
    },

    safe: (user) => {
        if (!user) return null;
        const { password, ...safe } = user;
        return {
            ...safe,
            journeyContext: normalizeUserJourneyContext(safe),
        };
    },
};

module.exports = users;
