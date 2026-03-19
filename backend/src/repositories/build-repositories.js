const { createLogger } = require('../logging/logger');

const logger = createLogger({ component: 'repositories.selector' });

const seedMemoryRepositories = (bundle) => {
    try {
        const testEmail = 'user123@gmail.com';
        const existing = bundle.users.findByEmail(testEmail);

        if (!existing) {
            bundle.users.create({
                name: 'Usuario de Prueba',
                email: testEmail,
                password: '123456',
            });

            logger.info('Usuario de prueba inicializado', {
                store: 'memory',
                emailDomain: 'gmail.com',
            });
        }
    } catch (error) {
        logger.warn('No se pudo inicializar usuario de prueba', {
            store: 'memory',
            error: error.message,
        });
    }
};

const buildRepositories = ({ useFirestore }) => {
    if (useFirestore) {
        logger.info('Store activo', { store: 'firestore' });
        return {
            users: require('./firestore/users.repository'),
            chats: require('./firestore/chats.repository'),
            analyses: require('./firestore/analyses.repository'),
            stats: require('./firestore/stats.repository'),
        };
    }

    logger.info('Store activo', { store: 'memory' });
    const bundle = {
        users: require('./memory/users.repository'),
        chats: require('./memory/chats.repository'),
        analyses: require('./memory/analyses.repository'),
        stats: require('./memory/stats.repository'),
    };

    seedMemoryRepositories(bundle);
    return bundle;
};

module.exports = {
    buildRepositories,
};
