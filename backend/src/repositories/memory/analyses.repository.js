const { v4: uuidv4 } = require('uuid');

const db = new Map();

const analyses = {
    _db: db,

    findByUserId: (userId) =>
        [...db.values()]
            .filter((analysis) => analysis.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),

    findLatestCompleted: (userId) =>
        [...db.values()]
            .filter((analysis) => analysis.userId === userId && analysis.status === 'completed')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null,

    findById: (id) => db.get(id) || null,

    create: (data) => {
        const analysis = {
            id: uuidv4(),
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

        db.set(analysis.id, analysis);
        return analysis;
    },

    update: (id, fields) => {
        const analysis = db.get(id);
        if (!analysis) return null;

        const updated = { ...analysis, ...fields, updatedAt: new Date().toISOString() };
        db.set(id, updated);
        return updated;
    },
};

module.exports = analyses;
