const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (admin.apps.length === 0) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID || 'onboarding-dev-487716';
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        const config = {
            projectId: projectId,
        };

        // If we have a local service account file, use it
        if (serviceAccountPath && require('fs').existsSync(path.resolve(process.cwd(), serviceAccountPath))) {
            config.credential = admin.credential.cert(path.resolve(process.cwd(), serviceAccountPath));
        }

        admin.initializeApp(config);
        console.log('✅ Firebase Admin Initialized');
    } catch (error) {
        console.error('❌ Firebase Admin Initialization Error:', error.stack);
    }
}

const db = admin.firestore();

// Set collection names as constants
const COLLECTIONS = {
    USERS: 'users',
    CHATS: 'chats',
    MESSAGES: 'messages',
    ANALYSES: 'analyses',
    MASTERS: 'masters',
    LEARNING_MODULES: 'learning_modules',
    TOPICS: 'topics',
};

module.exports = { admin, db, COLLECTIONS };
