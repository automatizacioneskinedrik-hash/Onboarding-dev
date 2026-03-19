const { openai, OPENAI_MODEL } = require('../../config/openai');
const { buildChatResponseFallback } = require('./ai-fallbacks.service');
const { buildChatMessages } = require('./prompts/chat-advisor.prompt');

const generateChatResponse = async ({
    messages,
    userProfile = null,
    recommendation = null,
    retrieval = null,
    logger,
    ensureConfigured,
}) => {
    if (!openai) {
        logger?.info('Respuesta de chat con fallback local', {
            messageCount: messages.length,
            hasRecommendation: Boolean(recommendation),
            matchCount: retrieval?.matches?.length || 0,
        });
        return buildChatResponseFallback(messages, recommendation, retrieval);
    }

    ensureConfigured();

    const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: buildChatMessages(messages, userProfile, recommendation, retrieval),
        temperature: 0.7,
        max_tokens: 800,
    });

    logger?.info('Respuesta de chat generada', {
        model: OPENAI_MODEL,
        messageCount: messages.length,
        hasRecommendation: Boolean(recommendation),
        matchCount: retrieval?.matches?.length || 0,
    });

    return response.choices[0].message.content;
};

const streamChatResponse = async function* ({
    messages,
    userProfile = null,
    recommendation = null,
    retrieval = null,
    logger,
    ensureConfigured,
}) {
    if (!openai) {
        logger?.info('Streaming de chat con fallback local', {
            messageCount: messages.length,
        });
        yield buildChatResponseFallback(messages, recommendation, retrieval);
        return;
    }

    ensureConfigured();

    const stream = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: buildChatMessages(messages, userProfile, recommendation, retrieval),
        temperature: 0.7,
        max_tokens: 800,
        stream: true,
    });

    for await (const chunk of stream) {
        const token = chunk.choices?.[0]?.delta?.content || '';
        if (token) {
            yield token;
        }
    }
};

const analyzeLinkedInProfile = async ({ linkedinUrl, logger, ensureConfigured }) => {
    ensureConfigured();

    const prompt = `Eres un experto en analisis de perfiles profesionales de LinkedIn.

El usuario ha proporcionado su URL de LinkedIn: ${linkedinUrl}

Como no podemos acceder directamente al perfil, genera un mensaje amigable explicando que:
1. Por politicas de privacidad, no podemos acceder directamente a LinkedIn.
2. Pidele que copie y pegue su resumen de LinkedIn o descripcion de su perfil.
3. O que suba su CV en PDF como alternativa.

Responde en espanol de forma amigable y profesional.`;

    const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
    });

    logger?.info('Guia de LinkedIn generada', {
        model: OPENAI_MODEL,
        linkedinUrl,
    });

    return {
        requiresManualInput: true,
        message: response.choices[0].message.content,
    };
};

module.exports = {
    generateChatResponse,
    streamChatResponse,
    analyzeLinkedInProfile,
};
