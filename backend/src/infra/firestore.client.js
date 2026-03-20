const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const { createLogger } = require('../services/observability/logger');

const logger = createLogger({ component: 'infra.firestore' });

if (admin.apps.length === 0) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID || 'onboarding-dev-487716';
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const config = { projectId };

        if (serviceAccountPath && fs.existsSync(path.resolve(process.cwd(), serviceAccountPath))) {
            config.credential = admin.credential.cert(path.resolve(process.cwd(), serviceAccountPath));
        }

        admin.initializeApp(config);
        logger.info('Firebase inicializado', {
            projectId,
            credentialsFile: Boolean(config.credential),
        });
    } catch (error) {
        logger.error('Error inicializando Firebase', {
            error: error.message,
        });
    }
}

const db = admin.firestore();

const COLLECTIONS = {
    USERS: 'users',
    CHATS: 'chats',
    MESSAGES: 'messages',
    ANALYSES: 'analyses',
    MASTERS: 'masters',
    LEARNING_MODULES: 'learning_modules',
    TOPICS: 'topics',
};

const createFirestoreClient = () => ({
    admin,
    db,
    collections: COLLECTIONS,
    collection: (name) => db.collection(name),
});

module.exports = {
    createFirestoreClient,
    admin,
    db,
    COLLECTIONS,
};
