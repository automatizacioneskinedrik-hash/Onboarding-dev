/**
 * LAR University - Main Server Entry Point
 * AI-powered specialization recommender
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { logger } = require('./src/logging/logger');
const { attachRequestContext } = require('./src/middleware/requestContext.middleware');
const { requestLogger } = require('./src/middleware/httpLogger.middleware');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const chatRoutes = require('./src/routes/chat.routes');
const cvRoutes = require('./src/routes/cv.routes');
const recommendationRoutes = require('./src/routes/recommendation.routes');
const userRoutes = require('./src/routes/user.routes');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';
const appLogger = logger.child({ component: 'server' });

app.use(attachRequestContext);
app.use(requestLogger);

// ─── Security Middleware ─────────────────────────────────────────────────────────
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

// ─── CORS ────────────────────────────────────────────────────────────────────────
const normalizeOrigin = (value = '') => value.trim().replace(/\/+$/, '');

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
        // Allow server-to-server or tools
        if (!origin) return callback(null, true);

        const requestOrigin = normalizeOrigin(origin);

        // If wildcard is set or origin matches
        if (allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin)) {
            return callback(null, true);
        }

        logger.warn('CORS bloqueado', {
            origin,
            allowedOrigins,
        });
        return callback(null, false); // Reject without throwing hard error
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ─── Rate Limiting ──────────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        req.log?.warn('Rate limit excedido', {
            userId: req.user?.id,
            method: req.method,
            path: req.originalUrl,
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
            httpRequest: {
                requestMethod: req.method,
                requestUrl: req.originalUrl,
                remoteIp: req.ip,
                userAgent: req.get('user-agent'),
                status: 429,
                protocol: req.protocol,
            },
        });

        res.status(429).json({
            success: false,
            message: 'Demasiadas solicitudes, por favor intenta más tarde.',
            requestId: req.requestId,
        });
    },
});
app.use('/api/', limiter);

// ─── Body Parsers ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Files ───────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'LAR University API is running 🚀',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        storage: process.env.USE_FIRESTORE === 'true' ? 'Firestore' : 'In-Memory',
        requestId: req.requestId,
    });
});

// ─── API Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/recommendations', recommendationRoutes);

// ─── Error Handling ──────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
   const storageMsg = process.env.USE_FIRESTORE === 'true' ? 'Firestore (Google Cloud)' : 'In-Memory (no DB yet)';
    console.log(`
  ╔═════════════════════════════════════════╗
  ║     LAR University Backend Server       ║
  ║     Port    : ${PORT}                      ║
  ║     Mode    : ${(process.env.NODE_ENV || 'development').padEnd(12)}              ║
  ║     Storage : ${storageMsg.padEnd(25)} ║
  ╚═════════════════════════════════════════╝
  `);
});

module.exports = app;
