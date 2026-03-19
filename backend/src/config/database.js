/**
 * MongoDB Database Connection
 */

const mongoose = require('mongoose');

const { createLogger } = require('../logging/logger');

const logger = createLogger({ component: 'config.database' });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });

        logger.info('MongoDB conectado', {
            host: conn.connection.host,
        });

        mongoose.connection.on('error', (err) => {
            logger.error('Error en MongoDB', {
                error: err.message,
            });
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB desconectado');
        });
    } catch (error) {
        logger.error('Fallo conexion MongoDB', {
            error: error.message,
        });
        process.exit(1);
    }
};

module.exports = connectDB;
