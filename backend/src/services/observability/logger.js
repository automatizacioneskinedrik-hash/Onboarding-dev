const fs = require('fs');
const path = require('path');

let Logging;
try {
    ({ Logging } = require('@google-cloud/logging'));
} catch (error) {
    Logging = null;
}

const { getRequestContext } = require('./request-context.service');

const LOG_LEVELS = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const CLOUD_SEVERITY = {
    debug: 'DEBUG',
    info: 'INFO',
    warn: 'WARNING',
    error: 'ERROR',
};

const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 500;
const SENSITIVE_KEY_PATTERN = /(authorization|cookie|password|secret|token|credential|api[-_]?key|session|signature|rawText)/i;
const INTERNAL_CONSOLE_KEYS = new Set(['severity', 'serviceContext', 'component', 'event', 'traceId', 'requestId']);

const currentLogLevel = (() => {
    const configuredLevel = String(process.env.LOG_LEVEL || '').trim().toLowerCase();
    if (LOG_LEVELS[configuredLevel]) {
        return configuredLevel;
    }

    return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
})();

const getProjectId = () =>
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    null;

const getServiceContext = () => ({
    service: process.env.K_SERVICE?.trim() || process.env.npm_package_name || 'lar-university-backend',
    version: process.env.K_REVISION?.trim() || process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
});

const isManagedGcpRuntime = () =>
    Boolean(
        process.env.K_SERVICE ||
        process.env.K_REVISION ||
        process.env.FUNCTION_TARGET ||
        process.env.GAE_SERVICE
    );

const shouldUseGoogleCloudLogging = () => {
    const explicitSetting = String(process.env.USE_GOOGLE_CLOUD_LOGGING || '').trim().toLowerCase();

    if (explicitSetting === 'true') {
        return true;
    }

    if (explicitSetting === 'false') {
        return false;
    }

    return isManagedGcpRuntime();
};

const resolveCredentialsPath = () => {
    const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!configuredPath) {
        return null;
    }

    const resolvedPath = path.resolve(process.cwd(), configuredPath);
    return fs.existsSync(resolvedPath) ? resolvedPath : null;
};

const shouldLog = (level) => (LOG_LEVELS[level] || LOG_LEVELS.info) >= (LOG_LEVELS[currentLogLevel] || LOG_LEVELS.info);

const truncateString = (value) =>
    value.length > MAX_STRING_LENGTH
        ? `${value.slice(0, MAX_STRING_LENGTH)}... [truncated ${value.length - MAX_STRING_LENGTH} chars]`
        : value;

const sanitizeForLogging = (value, depth = 0) => {
    if (value === null || value === undefined) {
        return value;
    }

    if (depth >= MAX_DEPTH) {
        return '[Truncated depth]';
    }

    if (value instanceof Error) {
        return serializeError(value);
    }

    if (Buffer.isBuffer(value)) {
        return {
            type: 'Buffer',
            length: value.length,
        };
    }

    if (Array.isArray(value)) {
        const sanitizedItems = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeForLogging(item, depth + 1));
        if (value.length > MAX_ARRAY_ITEMS) {
            sanitizedItems.push(`[Truncated ${value.length - MAX_ARRAY_ITEMS} items]`);
        }
        return sanitizedItems;
    }

    if (typeof value === 'string') {
        return truncateString(value);
    }

    if (typeof value !== 'object') {
        return value;
    }

    const sanitizedObject = {};
    for (const [key, rawValue] of Object.entries(value)) {
        if (typeof rawValue === 'function') {
            continue;
        }

        sanitizedObject[key] = SENSITIVE_KEY_PATTERN.test(key)
            ? '[REDACTED]'
            : sanitizeForLogging(rawValue, depth + 1);
    }

    return sanitizedObject;
};

function serializeError(error) {
    if (!error) {
        return null;
    }

    return sanitizeForLogging({
        name: error.name,
        message: error.message,
        statusCode: error.statusCode || error.status || null,
        code: error.code || null,
        stack: error.stack,
    });
}

const removeUndefined = (payload = {}) =>
    Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

const buildHttpRequestMetadata = (httpRequest) => {
    if (!httpRequest) {
        return undefined;
    }

    return removeUndefined({
        requestMethod: httpRequest.requestMethod,
        requestUrl: httpRequest.requestUrl,
        userAgent: httpRequest.userAgent,
        referer: httpRequest.referer,
        remoteIp: httpRequest.remoteIp,
        status: httpRequest.status,
        responseSize: httpRequest.responseSize,
        latency: httpRequest.latency,
        protocol: httpRequest.protocol,
    });
};

const createCloudLog = () => {
    if (!Logging) {
        return null;
    }

    try {
        if (!shouldUseGoogleCloudLogging()) {
            return null;
        }

        const projectId = getProjectId();
        const keyFilename = resolveCredentialsPath();
        if (!projectId && !keyFilename && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT) {
            return null;
        }

        const loggingClient = new Logging(removeUndefined({ projectId, keyFilename }));
        return loggingClient.logSync(process.env.CLOUD_LOGGING_LOG_NAME?.trim() || 'application');
    } catch (error) {
        const fallbackLog = {
            severity: 'ERROR',
            message: 'Failed to initialize Google Cloud Logging client. Falling back to stdout.',
            error: {
                message: error.message,
                stack: error.stack,
            },
        };
        process.stderr.write(`${JSON.stringify(fallbackLog)}\n`);
        return null;
    }
};

const cloudLog = createCloudLog();

const writeStructuredFallback = (entry) => {
    const line = `${JSON.stringify(entry)}\n`;
    if (entry.severity === 'ERROR' || entry.severity === 'CRITICAL') {
        process.stderr.write(line);
        return;
    }
    process.stdout.write(line);
};

const buildConsolePayload = (payload = {}, metadata = {}) => {
    const consolePayload = {};

    for (const [key, value] of Object.entries(payload)) {
        if (key === 'message' || INTERNAL_CONSOLE_KEYS.has(key) || value === undefined) {
            continue;
        }

        consolePayload[key] = value;
    }

    if (metadata.httpRequest) {
        consolePayload.http = removeUndefined({
            method: metadata.httpRequest.requestMethod,
            url: metadata.httpRequest.requestUrl,
            status: metadata.httpRequest.status,
            latency: metadata.httpRequest.latency,
            ip: metadata.httpRequest.remoteIp,
        });
    }

    return consolePayload;
};

const writeToConsole = (level, message, payload, metadata) => {
    const consoleMethod = console[level] || console.info;
    const consolePayload = buildConsolePayload(payload, metadata);

    if (Object.keys(consolePayload).length === 0) {
        consoleMethod(message);
        return;
    }

    consoleMethod(message, consolePayload);
};

const emitLog = (level, message, fields = {}, bindings = {}) => {
    if (!shouldLog(level)) {
        return;
    }

    const context = getRequestContext() || {};
    const payload = sanitizeForLogging(removeUndefined({
        message,
        severity: CLOUD_SEVERITY[level] || CLOUD_SEVERITY.info,
        component: bindings.component || fields.component,
        event: fields.event,
        serviceContext: getServiceContext(),
        requestId: context.requestId || fields.requestId,
        userId: fields.userId || context.userId,
        traceId: context.traceId,
        ...bindings,
        ...fields,
    }));

    const metadata = removeUndefined({
        severity: CLOUD_SEVERITY[level] || CLOUD_SEVERITY.info,
        httpRequest: buildHttpRequestMetadata(fields.httpRequest),
        trace: context.trace || fields.trace,
        spanId: context.spanId || fields.spanId,
        traceSampled: context.traceSampled,
        labels: removeUndefined({
            component: bindings.component || fields.component,
            environment: process.env.NODE_ENV || 'development',
        }),
    });

    if (cloudLog) {
        try {
            const entry = cloudLog.entry(metadata, payload);
            cloudLog.write(entry);
            return;
        } catch (error) {
            writeStructuredFallback({
                severity: 'ERROR',
                message: 'Failed to write structured log via Google Cloud Logging. Falling back to stdout.',
                error: serializeError(error),
            });
        }
    }

    const fallbackEntry = {
        ...payload,
        'logging.googleapis.com/trace': metadata.trace,
        'logging.googleapis.com/spanId': metadata.spanId,
        'logging.googleapis.com/trace_sampled': metadata.traceSampled,
        httpRequest: metadata.httpRequest,
    };

    writeToConsole(level, message, removeUndefined(fallbackEntry), metadata);
};

const createLogger = (bindings = {}) => ({
    debug: (message, fields = {}) => emitLog('debug', message, fields, bindings),
    info: (message, fields = {}) => emitLog('info', message, fields, bindings),
    warn: (message, fields = {}) => emitLog('warn', message, fields, bindings),
    error: (message, fields = {}) => emitLog('error', message, fields, bindings),
    child: (extraBindings = {}) => createLogger({ ...bindings, ...extraBindings }),
});

const logger = createLogger();

module.exports = {
    createLogger,
    getProjectId,
    logger,
    sanitizeForLogging,
    serializeError,
    shouldUseGoogleCloudLogging,
};
