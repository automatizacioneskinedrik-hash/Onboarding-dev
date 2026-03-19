const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const db = new Map();

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

const users = {
    _db: db,

    findByEmail: (email) => {
        if (!email) return null;

        for (const user of db.values()) {
            if (user.email === email.toLowerCase()) {
                return user;
            }
        }

        return null;
    },

    findById: (id) => db.get(id) || null,

    create: (userData) => {
        const { name, email, password } = userData;

        if (users.findByEmail(email)) {
            throw new Error('DUPLICATE_EMAIL');
        }

        const user = {
            ...userData,
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
        };

        db.set(user.id, user);
        return user;
    },

    update: (id, fields) => {
        const user = db.get(id);
        if (!user) return null;

        const updated = { ...user, ...fields, updatedAt: new Date().toISOString() };
        db.set(id, updated);
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

module.exports = users;
