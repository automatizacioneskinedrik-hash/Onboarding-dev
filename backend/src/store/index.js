/**
 * Store Index
 * Exports the active store implementation.
 */

const { createLogger } = require('../logging/logger');

const logger = createLogger({ component: 'store.index' });
const useFirestore = process.env.USE_FIRESTORE === 'true' || process.env.NODE_ENV === 'production';

if (useFirestore) {
    logger.info('Store activo', { store: 'firestore' });
    module.exports = require('./firestoreStore');
} else {
    logger.info('Store activo', { store: 'memory' });
    module.exports = require('./memoryStore');
}
