const crypto = require('crypto');

const { createLogger, getProjectId } = require('../../services/observability/logger');
const { runWithRequestContext } = require('../../services/observability/request-context.service');

const logger = createLogger({ component: 'middleware.request-context' });

const parseCloudTraceHeader = (headerValue = '') => {
    const [tracePart, optionsPart] = String(headerValue || '').split(';');
    const [traceId, spanId] = tracePart.split('/');
    const sampled = optionsPart?.includes('o=1') || false;

    return {
        traceId: traceId || null,
        spanId: spanId || null,
        traceSampled: sampled,
    };
};

const attachRequestContext = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    const traceHeader = req.headers['x-cloud-trace-context'];
    const projectId = getProjectId();
    const traceContext = parseCloudTraceHeader(traceHeader);
    const trace =
        projectId && traceContext.traceId
            ? `projects/${projectId}/traces/${traceContext.traceId}`
            : null;

    res.setHeader('X-Request-Id', requestId);

    runWithRequestContext(
        {
            requestId,
            trace,
            traceId: traceContext.traceId,
            spanId: traceContext.spanId,
            traceSampled: traceContext.traceSampled,
        },
        () => {
            req.requestId = requestId;
            req.log = logger.child({ requestId });
            next();
        }
    );
};

module.exports = {
    attachRequestContext,
};
