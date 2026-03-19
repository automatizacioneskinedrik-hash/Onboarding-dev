/**
 * Global Error Handler Middleware
 */

const { createLogger } = require('../logging/logger');

const logger = createLogger({ component: 'middleware.error-handler' });

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
    const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Error interno del servidor';

    if (err.name === 'ValidationError') {
        statusCode = 400;
        const errors = Object.values(err.errors).map((item) => item.message);
        message = errors.join('. ');
    }

    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0];
        message = `Ya existe un registro con ese ${field}. Por favor usa uno diferente.`;
    }

    if (err.name === 'CastError') {
        statusCode = 400;
        message = `ID invalido: ${err.value}`;
    }

    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Token invalido. Por favor inicia sesion nuevamente.';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Tu sesion ha expirado. Por favor inicia sesion nuevamente.';
    }

    const requestLogger = req.log || logger;
    requestLogger[statusCode >= 500 ? 'error' : 'warn']('Request con error', {
        method: req.method,
        path: req.originalUrl,
        statusCode,
        error: err.message,
        errorName: err.name,
        httpRequest: {
            requestMethod: req.method,
            requestUrl: req.originalUrl,
            remoteIp: req.ip,
            userAgent: req.get('user-agent'),
            status: statusCode,
            protocol: req.protocol,
        },
    });

    res.status(statusCode).json({
        success: false,
        message,
        requestId: req.requestId,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = { notFound, errorHandler };
