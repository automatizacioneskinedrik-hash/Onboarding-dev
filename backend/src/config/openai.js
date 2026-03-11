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

module.exports = { openai, OPENAI_MODEL, openaiApiKey };
