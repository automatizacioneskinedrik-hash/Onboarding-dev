/**
 * Authentication Middleware
 * JWT token verification using Firestore/In-memory store via Store Index.
 */

const jwt = require('jsonwebtoken');

const { createLogger } = require('../logging/logger');
const { setRequestContext } = require('../logging/request-context');
const { users } = require('../store');

const logger = createLogger({ component: 'middleware.auth' });

const FALLBACK_JWT_SECRET = 'dev-only-fallback-secret-change-in-prod';
let warnedAboutFallbackSecret = false;

const getJwtSecret = () => {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) {
        return process.env.JWT_SECRET;
    }

    if (!warnedAboutFallbackSecret) {
        warnedAboutFallbackSecret = true;
        logger.warn('JWT_SECRET no configurado, usando fallback local');
    }

    return FALLBACK_JWT_SECRET;
};

/**
 * Protect routes - verify JWT token
 */
const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            req.log?.warn('Acceso sin token', {
                method: req.method,
                path: req.originalUrl,
                httpRequest: {
                    requestMethod: req.method,
                    requestUrl: req.originalUrl,
                    remoteIp: req.ip,
                    userAgent: req.get('user-agent'),
                    status: 401,
                    protocol: req.protocol,
                },
            });

            return res.status(401).json({
                success: false,
                message: 'No autorizado. Por favor inicia sesion.',
                requestId: req.requestId,
            });
        }

        const decoded = jwt.verify(token, getJwtSecret());
        const user = await users.findById(decoded.id);

        if (!user) {
            req.log?.warn('Token con usuario inexistente', {
                userId: decoded.id,
            });

            return res.status(401).json({
                success: false,
                message: 'El usuario ya no existe.',
                requestId: req.requestId,
            });
        }

        if (!user.isActive) {
            req.log?.warn('Acceso bloqueado por usuario inactivo', {
                userId: user.id,
            });

            return res.status(401).json({
                success: false,
                message: 'Tu cuenta ha sido desactivada.',
                requestId: req.requestId,
            });
        }

        req.user = users.safe(user);
        setRequestContext({ userId: req.user.id });
        req.log = (req.log || logger).child({ userId: req.user.id });
        next();
    } catch (error) {
        req.log?.warn('Token invalido', {
            error: error.message,
            errorName: error.name,
        });

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token invalido.',
                requestId: req.requestId,
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Tu sesion ha expirado. Por favor inicia sesion nuevamente.',
                requestId: req.requestId,
            });
        }

        next(error);
    }
};

/**
 * Restrict to specific roles
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            req.log?.warn('Operacion prohibida por rol', {
                userId: req.user.id,
                role: req.user.role,
                requiredRoles: roles,
            });

            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para realizar esta accion.',
                requestId: req.requestId,
            });
        }

        next();
    };
};

/**
 * Generate JWT token
 */
const generateToken = (userId) =>
    jwt.sign({ id: userId }, getJwtSecret(), {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

module.exports = { protect, restrictTo, generateToken, getJwtSecret };
