/**
 * OpenAI Client Configuration
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const OpenAI = require('openai');

const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const openai = openaiApiKey
    ? new OpenAI({ apiKey: openaiApiKey })
    : null;

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';

module.exports = { openai, OPENAI_MODEL, OPENAI_EMBEDDING_MODEL, openaiApiKey };
