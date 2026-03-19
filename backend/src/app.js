const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { logger } = require('./logging/logger');
const { attachRequestContext } = require('./middleware/requestContext.middleware');
const { requestLogger } = require('./middleware/httpLogger.middleware');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const cvRoutes = require('./routes/cv.routes');
const recommendationRoutes = require('./routes/recommendation.routes');
const userRoutes = require('./routes/user.routes');

const normalizeOrigin = (value = '') => value.trim().replace(/\/+$/, '');

const buildApp = () => {
    const app = express();
    const configuredOrigins = (
        process.env.CORS_ORIGINS ||
        process.env.CORS_ORIGIN ||
        process.env.FRONTEND_URLS ||
        process.env.FRONTEND_URL ||
        'http://localhost:3000'
    )
        .split(',')
        .map(normalizeOrigin)
        .filter(Boolean);

    const allowedOrigins = Array.from(new Set(configuredOrigins.map(normalizeOrigin)));
    const corsOptions = {
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }

            const requestOrigin = normalizeOrigin(origin);

            if (allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin)) {
                return callback(null, true);
            }

            logger.warn('CORS bloqueado', {
                origin,
                allowedOrigins,
            });

            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    };

    const limiter = rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            req.log?.warn('Rate limit excedido', {
                userId: req.user?.id,
                method: req.method,
                path: req.originalUrl,
                maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
            });

            res.status(429).json({
                success: false,
                message: 'Demasiadas solicitudes, por favor intenta más tarde.',
                requestId: req.requestId,
            });
        },
    });

    app.use(attachRequestContext);
    app.use(requestLogger);

    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
        })
    );

    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));

    app.use('/api/', limiter);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

    app.get('/health', (req, res) => {
        res.status(200).json({
            success: true,
            message: 'LAR University API is running',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            storage: process.env.USE_FIRESTORE === 'true' ? 'Firestore' : 'In-Memory',
            requestId: req.requestId,
        });
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/cv', cvRoutes);
    app.use('/api/recommendations', recommendationRoutes);

    app.use(notFound);
    app.use(errorHandler);

    return app;
};

module.exports = {
    buildApp,
};
