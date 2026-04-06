const { createLogger } = require('../services/observability/logger');
const { getSpecializationNamesForPrompt } = require('../utils/seed-learning-content');
const {
    buildFallbackProfile,
    buildChatResponseFallback,
} = require('./ai-fallbacks');
const { resolveUniversityRecommendation } = require('./university-route-planner');

const createAiOrchestrator = ({
    openAiClient,
    contextManager,
    promptBuilder,
    logger = createLogger({ component: 'ai.orchestrator' }),
}) => {
    // Si OpenAI no esta disponible, el sistema aun debe producir un perfil util para no
    // bloquear onboarding, demos ni tests locales.
    const extractProfile = async ({ cvText, log = logger }) => {
        if (!openAiClient.isConfigured()) {
            log?.info('Perfil CV con fallback local', {
                textLength: cvText?.length || 0,
            });
            return buildFallbackProfile(cvText);
        }

        openAiClient.ensureConfigured();

        const response = await openAiClient.createChatCompletion({
            messages: [{ role: 'user', content: promptBuilder.buildProfileExtractionPrompt(cvText) }],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });

        log?.info('Perfil CV extraido', {
            model: openAiClient.getChatModel(),
            textLength: cvText?.length || 0,
        });

        return JSON.parse(response.choices[0].message.content);
    };

    // La recomendacion siempre se resuelve con el planner interno para normalizar ids,
    // bloques y enlaces aunque la salida del modelo venga incompleta o con nombres variables.
    const generateRecommendation = async ({ profile, sourceType = 'pdf', options = {}, log = logger }) => {
        if (!openAiClient.isConfigured()) {
            const fallbackRecommendation = resolveUniversityRecommendation({
                profile,
                masterId: options.masterId,
            });

            log?.info('Recomendacion generada con fallback local', {
                sourceType,
                masterId: options.masterId || null,
                specializationId: fallbackRecommendation.primarySpecializationId,
                planBlocks: fallbackRecommendation.planBlocks.length,
            });

            return fallbackRecommendation;
        }

        openAiClient.ensureConfigured();
        const prompt = promptBuilder.buildRecommendationPrompt({
            profile,
            options,
            specializationsList: getSpecializationNamesForPrompt(options.masterId),
        });

        try {
            const response = await openAiClient.createChatCompletion({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                response_format: { type: 'json_object' },
            });

            const result = JSON.parse(response.choices[0].message.content);
            const resolvedRecommendation = resolveUniversityRecommendation({
                profile,
                masterId: options.masterId,
                aiRecommendation: result,
            });

            log?.info('Recomendacion generada', {
                model: openAiClient.getChatModel(),
                sourceType,
                masterId: options.masterId || null,
                specializationId: resolvedRecommendation.primarySpecializationId,
                planBlocks: resolvedRecommendation.planBlocks.length,
            });

            return resolvedRecommendation;
        } catch (error) {
            // Ante JSON invalido o respuesta inesperada preferimos degradar a una recomendacion
            // deterministica antes que propagar datos parciales al usuario.
            log?.warn('Respuesta IA invalida, usando fallback', {
                masterId: options.masterId,
                error: error.message,
            });
            const fallbackRecommendation = resolveUniversityRecommendation({
                profile,
                masterId: options.masterId,
            });

            log?.info('Recomendacion generada con fallback de retrieval', {
                sourceType,
                masterId: options.masterId || null,
                specializationId: fallbackRecommendation.primarySpecializationId,
                planBlocks: fallbackRecommendation.planBlocks.length,
            });

            return fallbackRecommendation;
        }
    };

    // El fallback local reutiliza recommendation y retrieval para que el chat siga siendo
    // contextual incluso cuando el proveedor externo no responde.
    const generateChatResponse = async ({
        messages,
        userProfile = null,
        recommendation = null,
        retrieval = null,
        chatJourneyContext = null,
        log = logger,
    }) => {
        if (!openAiClient.isConfigured()) {
            log?.info('Respuesta de chat con fallback local', {
                messageCount: messages.length,
                hasRecommendation: Boolean(recommendation),
                matchCount: retrieval?.matches?.length || 0,
            });
            return buildChatResponseFallback(messages, recommendation, retrieval, chatJourneyContext);
        }

        openAiClient.ensureConfigured();

        const response = await openAiClient.createChatCompletion({
            messages: promptBuilder.buildChatMessages(
                messages,
                userProfile,
                recommendation,
                retrieval,
                chatJourneyContext
            ),
            temperature: 0.7,
            max_tokens: 800,
        });

        log?.info('Respuesta de chat generada', {
            model: openAiClient.getChatModel(),
            messageCount: messages.length,
            hasRecommendation: Boolean(recommendation),
            matchCount: retrieval?.matches?.length || 0,
        });

        return response.choices[0].message.content;
    };

    // La version streaming comparte el mismo prompt de la version no streaming para evitar
    // divergencias entre lo que probamos y lo que recibe el cliente por SSE.
    const streamChatResponse = async function* ({
        messages,
        userProfile = null,
        recommendation = null,
        retrieval = null,
        chatJourneyContext = null,
        log = logger,
    }) {
        if (!openAiClient.isConfigured()) {
            log?.info('Streaming de chat con fallback local', {
                messageCount: messages.length,
            });
            yield buildChatResponseFallback(messages, recommendation, retrieval, chatJourneyContext);
            return;
        }

        openAiClient.ensureConfigured();

        const stream = await openAiClient.createChatCompletionStream({
            messages: promptBuilder.buildChatMessages(
                messages,
                userProfile,
                recommendation,
                retrieval,
                chatJourneyContext
            ),
            temperature: 0.7,
            max_tokens: 800,
        });

        for await (const chunk of stream) {
            const token = chunk.choices?.[0]?.delta?.content || '';
            if (token) {
                yield token;
            }
        }
    };

    // LinkedIn no se consulta directamente: esta funcion solo genera la guia para pedir
    // al usuario un resumen manual o una alternativa en PDF.
    const analyzeLinkedIn = async ({ linkedinUrl, log = logger }) => {
        if (!openAiClient.isConfigured()) {
            return {
                requiresManualInput: true,
                message: 'Para analizar tu perfil de LinkedIn, copia y pega el resumen de tu perfil o sube tu CV en PDF.',
            };
        }

        openAiClient.ensureConfigured();

        const prompt = `Eres un experto en analisis de perfiles profesionales de LinkedIn.

El usuario ha proporcionado su URL de LinkedIn: ${linkedinUrl}

Como no podemos acceder directamente al perfil, genera un mensaje amigable explicando que:
1. Por politicas de privacidad, no podemos acceder directamente a LinkedIn.
2. Pidele que copie y pegue su resumen de LinkedIn o descripcion de su perfil.
3. O que suba su CV en PDF como alternativa.

Responde en espanol de forma amigable y profesional.`;

        const response = await openAiClient.createChatCompletion({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 300,
        });

        log?.info('Guia de LinkedIn generada', {
            model: openAiClient.getChatModel(),
            linkedinUrl,
        });

        return {
            requiresManualInput: true,
            message: response.choices[0].message.content,
        };
    };

    return {
        extractProfile,
        generateRecommendation,
        generateChatResponse,
        streamChatResponse,
        analyzeLinkedIn,
    };
};

module.exports = {
    createAiOrchestrator,
};
