const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const OpenAI = require('openai');
const { createLogger } = require('../services/observability/logger');

const logger = createLogger({ component: 'infra.openai' });
const chatModel = process.env.OPENAI_MODEL || 'gpt-4o';
const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const client = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const createConfigurationError = () => {
    const error = new Error('OPENAI_API_KEY is not configured.');
    error.statusCode = 503;
    return error;
};

const createOpenAiClient = () => ({
    getClient: () => client,
    getChatModel: () => chatModel,
    isConfigured: () => Boolean(client),
    ensureConfigured: () => {
        if (!client) {
            logger.warn('OpenAI no configurado');
            throw createConfigurationError();
        }
    },
    createChatCompletion: async (payload) => {
        if (!client) {
            throw createConfigurationError();
        }

        return client.chat.completions.create({
            model: chatModel,
            ...payload,
        });
    },
    createChatCompletionStream: async (payload) => {
        if (!client) {
            throw createConfigurationError();
        }

        return client.chat.completions.create({
            model: chatModel,
            stream: true,
            ...payload,
        });
    },
});

module.exports = {
    createOpenAiClient,
};
