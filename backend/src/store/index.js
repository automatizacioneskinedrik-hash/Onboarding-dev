/**
 * Store Index
 * Exports the active repository bundle.
 */

const { buildRepositories } = require('../repositories/build-repositories');

const useFirestore = process.env.USE_FIRESTORE === 'true' || process.env.NODE_ENV === 'production';

module.exports = buildRepositories({ useFirestore });
