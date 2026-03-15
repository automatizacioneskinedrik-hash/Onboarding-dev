/**
 * In-Memory Store
 * Temporary storage while PostgreSQL is being configured.
 * All data resets on server restart.
 * 
 * TODO: Replace with PostgreSQL (pg / Prisma) when ready.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// ─── Data Collections ─────────────────────────────────────────────────────────
const db = {
    users: new Map(),       // userId -> User object
    chats: new Map(),       // chatId -> Chat object
    analyses: new Map(),    // analysisId -> CVAnalysis object
};

// ─── Password Helpers (using native crypto, no bcrypt needed) ─────────────────
const hashPassword = (password) => {
    if (!password) return null;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

const comparePassword = (password, stored) => {
    if (!stored || !password) return false;
    const [salt, hash] = stored.split(':');
    const inputHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return inputHash === hash;
};

// ─── User Operations ──────────────────────────────────────────────────────────
const users = {
    findByEmail: (email) => {
        if (!email) return null;
        for (const user of db.users.values()) {
            if (user.email === email.toLowerCase()) return user;
        }
        return null;
    },

    findById: (id) => db.users.get(id) || null,

    create: (userData) => {
        const { name, email, password } = userData;
        if (users.findByEmail(email)) {
            throw new Error('DUPLICATE_EMAIL');
        }
        const user = {
            id: uuidv4(),
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
            ...userData, // allow any extra fields
        };
        db.users.set(user.id, user);
        return user;
    },

    update: (id, fields) => {
        const user = db.users.get(id);
        if (!user) return null;
        const updated = { ...user, ...fields, updatedAt: new Date().toISOString() };
        db.users.set(id, updated);
        return updated;
    },

    verifyPassword: (user, password) => {
        if (user.isGoogleAccount && !user.password) return false;
        return comparePassword(password, user.password);
    },

    // Return user without password
    safe: (user) => {
        if (!user) return null;
        const { password, ...safe } = user;
        return safe;
    },
};

// ─── Chat Operations ──────────────────────────────────────────────────────────
const chats = {
    findByUserId: (userId, { page = 1, limit = 20 } = {}) => {
        const all = [...db.chats.values()]
            .filter((c) => c.userId === userId && c.isActive)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        const total = all.length;
        const skip = (page - 1) * limit;
        const items = all.slice(skip, skip + limit).map((c) => ({
            id: c.id,
            title: c.title,
            messageCount: c.messages.length,
            finalRecommendation: c.finalRecommendation,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));

        return { items, total };
    },

    findById: (id) => db.chats.get(id) || null,

    findByIdAndUser: (id, userId) => {
        const chat = db.chats.get(id);
        return chat && chat.userId === userId && chat.isActive ? chat : null;
    },

    create: ({ userId, title = 'Nueva conversación', cvAnalysisId = null }) => {
        const chat = {
            id: uuidv4(),
            userId,
            title,
            messages: [],
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        db.chats.set(chat.id, chat);
        return chat;
    },

    addMessage: (chatId, message) => {
        const chat = db.chats.get(chatId);
        if (!chat) return null;
        const msg = {
            id: uuidv4(),
            ...message,
            timestamp: new Date().toISOString(),
        };
        chat.messages.push(msg);
        chat.updatedAt = new Date().toISOString();
        db.chats.set(chatId, chat);
        return msg;
    },

    update: (id, fields) => {
        const chat = db.chats.get(id);
        if (!chat) return null;
        const updated = { ...chat, ...fields, updatedAt: new Date().toISOString() };
        db.chats.set(id, updated);
        return updated;
    },

    softDelete: (id, userId) => {
        const chat = db.chats.get(id);
        if (!chat || chat.userId !== userId) return false;
        db.chats.set(id, { ...chat, isActive: false, updatedAt: new Date().toISOString() });
        return true;
    },
};

// ─── CV Analysis Operations ───────────────────────────────────────────────────
const analyses = {
    findByUserId: (userId) =>
        [...db.analyses.values()]
            .filter((a) => a.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),

    findLatestCompleted: (userId) =>
        [...db.analyses.values()]
            .filter((a) => a.userId === userId && a.status === 'completed')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null,

    findById: (id) => db.analyses.get(id) || null,

    create: (data) => {
        const analysis = {
            id: uuidv4(),
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
        db.analyses.set(analysis.id, analysis);
        return analysis;
    },

    update: (id, fields) => {
        const analysis = db.analyses.get(id);
        if (!analysis) return null;
        const updated = { ...analysis, ...fields, updatedAt: new Date().toISOString() };
        db.analyses.set(id, updated);
        return updated;
    },
};

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = {
    chatCountByUser: (userId) =>
        [...db.chats.values()].filter((c) => c.userId === userId && c.isActive).length,

    analysisCountByUser: (userId) =>
        [...db.analyses.values()].filter((a) => a.userId === userId && a.status === 'completed').length,
};

// ─── Startup Seed (Test User) ─────────────────────────────────────────────────
// Auto-create test user if it doesn't exist
try {
    const testEmail = 'user123@gmail.com';
    const existing = users.findByEmail(testEmail);
    if (!existing) {
        users.create({
            name: 'Usuario de Prueba',
            email: testEmail,
            password: '123456'
        });
        console.log(`✅ Test user created: ${testEmail} / 123456`);
    }
} catch (err) {
    console.warn('⚠️ Error seeding test user:', err.message);
}

module.exports = { users, chats, analyses, stats };
