/**
 * Embedding Service
 * Generates vector embeddings for user messages before retrieval with Vertex AI Vector Search.
 */

const { openai, OPENAI_EMBEDDING_MODEL } = require('../config/openai');

const ensureEmbeddingConfigured = () => {
    if (!openai) {
        const error = new Error('OPENAI_API_KEY is not configured.');
        error.statusCode = 503;
        throw error;
    }
};

const normalizeTextForEmbedding = (text = '') => text.replace(/\s+/g, ' ').trim();

/**
 * Create an embedding for arbitrary text.
 * @param {string} text
 * @returns {Promise<{ embedding: number[], model: string, dimensions: number }>}
 */
const createTextEmbedding = async (text) => {
    const normalizedText = normalizeTextForEmbedding(text);

    if (!normalizedText) {
        const error = new Error('Cannot create embedding for empty text.');
        error.statusCode = 400;
        throw error;
    }

    ensureEmbeddingConfigured();

    const response = await openai.embeddings.create({
        model: OPENAI_EMBEDDING_MODEL,
        input: normalizedText,
    });

    const embedding = response.data?.[0]?.embedding;

    if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Embedding generation returned an empty vector.');
    }

    return {
        embedding,
        model: OPENAI_EMBEDDING_MODEL,
        dimensions: embedding.length,
    };
};

module.exports = {
    createTextEmbedding,
    normalizeTextForEmbedding,
};
