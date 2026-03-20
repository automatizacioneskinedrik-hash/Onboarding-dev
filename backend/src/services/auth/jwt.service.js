const jwt = require('jsonwebtoken');

const FALLBACK_JWT_SECRET = 'dev-only-fallback-secret-change-in-prod';

const getJwtSecret = () => {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) {
        return process.env.JWT_SECRET;
    }

    return FALLBACK_JWT_SECRET;
};

const generateToken = (userId) =>
    jwt.sign({ id: userId }, getJwtSecret(), {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

module.exports = {
    generateToken,
    getJwtSecret,
    FALLBACK_JWT_SECRET,
};
