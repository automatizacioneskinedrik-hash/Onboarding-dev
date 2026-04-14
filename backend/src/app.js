const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { logger } = require('./services/observability/logger');
const { getAppContainer } = require('./composition-root');
const { attachRequestContext } = require('./http/middleware/request-context.middleware');
const { requestLogger } = require('./http/middleware/http-logger.middleware');
const { errorHandler, notFound } = require('./http/middleware/error-handler.middleware');
const { buildOpenApiSpec, buildSwaggerHtml } = require('./http/swagger/openapi');

const authRoutes = require('./http/routes/auth.routes');
const chatRoutes = require('./http/routes/chat.routes');
const cvRoutes = require('./http/routes/cv.routes');
const recommendationRoutes = require('./http/routes/recommendation.routes');
const userRoutes = require('./http/routes/user.routes');
const onboardingRoutes = require('./http/routes/onboarding.routes');

const normalizeOrigin = (value = '') => value.trim().replace(/\/+$/, '');

const buildApp = () => {
    const app = express();
    app.locals.container = getAppContainer();
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
            message: 'LÄR University API is running',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            storage: process.env.USE_FIRESTORE === 'true' ? 'Firestore' : 'In-Memory',
            requestId: req.requestId,
        });
    });

    app.get('/api/docs.json', (req, res) => {
        const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
        const protocol = req.protocol || 'http';
        res.status(200).json(
            buildOpenApiSpec({
                baseUrl: `${protocol}://${host}`,
            })
        );
    });

    app.get('/api/docs', (req, res) => {
        res.type('html').send(buildSwaggerHtml());
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/cv', cvRoutes);
    app.use('/api/recommendations', recommendationRoutes);
    app.use('/api/onboarding', onboardingRoutes);

    app.use(notFound);
    app.use(errorHandler);

    return app;
};

module.exports = {
    buildApp,
};
