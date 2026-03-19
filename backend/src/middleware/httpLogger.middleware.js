const { createLogger, sanitizeForLogging } = require('../logging/logger');

const logger = createLogger({ component: 'middleware.http' });

// Solo deja metadatos seguros y utiles del request para no contaminar los logs.
const buildRequestPayload = (req) => sanitizeForLogging({
    params: req.params,
    query: req.query,
    bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : undefined,
    file: req.file
        ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
        }
        : undefined,
    files: Array.isArray(req.files)
        ? req.files.map((file) => ({
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        }))
        : undefined,
});

// Traduce el request/response de Express al formato httpRequest esperado por GCP.
const buildHttpMetadata = (req, res, durationMs) => ({
    requestMethod: req.method,
    requestUrl: req.originalUrl,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    remoteIp: req.ip,
    status: res.statusCode,
    responseSize: res.getHeader('content-length'),
    latency: `${durationMs.toFixed(3)}ms`,
    protocol: req.protocol,
});

// Registra una sola linea por request completado o abortado.
const requestLogger = (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    const finalizeLog = (event, message) => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const httpRequest = buildHttpMetadata(req, res, durationMs);
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        logger[level](message, {
            event,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Number(durationMs.toFixed(1)),
            ip: req.ip,
            userId: req.user?.id || null,
            httpRequest,
            request: buildRequestPayload(req),
        });
    };

    res.on('finish', () => finalizeLog('http.request.completed', 'HTTP completado'));
    res.on('close', () => {
        if (!res.writableEnded) {
            finalizeLog('http.request.aborted', 'HTTP abortado');
        }
    });

    next();
};

module.exports = {
    requestLogger,
};
