const sendSuccess = (res, { statusCode = 200, message, data, ...extra } = {}) => {
    const payload = {
        success: true,
        ...(message ? { message } : {}),
        ...(data !== undefined ? { data } : {}),
        ...extra,
    };

    return res.status(statusCode).json(payload);
};

const sendError = (res, { statusCode = 400, message, ...extra } = {}) =>
    res.status(statusCode).json({
        success: false,
        message,
        ...extra,
    });

module.exports = {
    sendSuccess,
    sendError,
};
