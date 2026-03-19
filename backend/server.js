require('dotenv').config();

const { logger } = require('./src/logging/logger');
const { buildApp } = require('./src/app');

const app = buildApp();
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';
const appLogger = logger.child({ component: 'server' });

app.listen(PORT, HOST, () => {
    appLogger.info('Servidor iniciado', {
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV || 'development',
        storage: process.env.USE_FIRESTORE === 'true' ? 'Firestore' : 'In-Memory',
    });
});

module.exports = app;
