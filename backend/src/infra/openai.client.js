const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const OpenAI = require('openai');
const { createLogger } = require('../services/observability/logger');

const logger = createLogger({ component: 'infra.openai' });
const chatModel = process.env.OPENAI_MODEL || 'gpt-4o';
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';
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
    getEmbeddingModel: () => embeddingModel,
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
    createEmbedding: async (input) => {
        if (!client) {
            throw createConfigurationError();
        }

        return client.embeddings.create({
            model: embeddingModel,
            input,
        });
    },
});

module.exports = {
    createOpenAiClient,
};
