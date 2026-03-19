const { openai } = require('../config/openai');
const { createLogger } = require('../logging/logger');
const { extractProfileFromCV: extractProfileFromCVImpl } = require('./openai/profile-extraction.service');
const { generateRecommendation: generateRecommendationImpl } = require('./openai/recommendation-generation.service');
const {
    generateChatResponse: generateChatResponseImpl,
    streamChatResponse: streamChatResponseImpl,
    analyzeLinkedInProfile: analyzeLinkedInProfileImpl,
} = require('./openai/chat-advisor.service');

const logger = createLogger({ component: 'service.openai' });

const ensureOpenAIConfigured = () => {
    if (!openai) {
        logger.warn('OpenAI no configurado, usando fallback');
        const error = new Error('OPENAI_API_KEY is not configured.');
        error.statusCode = 503;
        throw error;
    }
};

const extractProfileFromCV = (cvText) =>
    extractProfileFromCVImpl({
        cvText,
        logger,
        ensureConfigured: ensureOpenAIConfigured,
    });

const generateRecommendation = (profile, sourceType = 'pdf', options = {}) =>
    generateRecommendationImpl({
        profile,
        sourceType,
        options,
        logger,
        ensureConfigured: ensureOpenAIConfigured,
    });

const generateChatResponse = (messages, userProfile = null, recommendation = null, retrieval = null) =>
    generateChatResponseImpl({
        messages,
        userProfile,
        recommendation,
        retrieval,
        logger,
        ensureConfigured: ensureOpenAIConfigured,
    });

const streamChatResponse = (messages, userProfile = null, recommendation = null, retrieval = null) =>
    streamChatResponseImpl({
        messages,
        userProfile,
        recommendation,
        retrieval,
        logger,
        ensureConfigured: ensureOpenAIConfigured,
    });

const analyzeLinkedInProfile = (linkedinUrl) =>
    analyzeLinkedInProfileImpl({
        linkedinUrl,
        logger,
        ensureConfigured: ensureOpenAIConfigured,
    });

module.exports = {
    extractProfileFromCV,
    generateRecommendation,
    generateChatResponse,
    streamChatResponse,
    analyzeLinkedInProfile,
};
