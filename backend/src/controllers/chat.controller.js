/**
 * Chat Controller
 * Uses Firestore (via Store Index).
 */

const { createLogger } = require('../logging/logger');
const { chats, analyses } = require('../store');
const { streamChatResponse } = require('../services/openai.service');
const { createTextEmbedding } = require('../services/embedding.service');
const { retrieveRelevantCourses } = require('../services/course-retrieval.service');

const logger = createLogger({ component: 'controller.chat' });

// Resume el uso de embeddings y retrieval para enviarlo por SSE al frontend.
const buildRetrievalPayload = (retrieval, messageEmbedding) => ({
    embeddingGenerated: Boolean(messageEmbedding),
    embeddingModel: messageEmbedding?.model || null,
    embeddingDimensions: messageEmbedding?.dimensions || null,
    vectorSearchUsed: Boolean(retrieval),
    matches:
        retrieval?.matches.slice(0, 3).map((match) => ({
            id: match.id,
            title: match.title,
            contentType: match.contentType,
            moduleTitle: match.moduleTitle,
            distance: match.distance,
        })) || [],
});

// Escribe un evento SSE en el stream abierto del chat.
const writeSseEvent = (res, payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

// Lista los chats activos del usuario con paginacion simple.
const getUserChats = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;

        const { items, total } = await chats.findByUserId(req.user.id, { page, limit });

        res.status(200).json({
            success: true,
            data: {
                chats: items,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// Crea una nueva conversacion opcionalmente enlazada a un analisis previo.
const createChat = async (req, res, next) => {
    try {
        const { title, cvAnalysisId } = req.body;
        const chat = await chats.create({
            userId: req.user.id,
            title: title || 'Nueva conversacion',
            cvAnalysisId: cvAnalysisId || null,
        });

        req.log?.info('Chat creado', {
            userId: req.user.id,
            chatId: chat.id,
            cvAnalysisId: cvAnalysisId || null,
        });

        res.status(201).json({
            success: true,
            message: 'Chat creado exitosamente.',
            data: { chat },
        });
    } catch (error) {
        next(error);
    }
};

// Recupera un chat puntual validando que pertenezca al usuario autenticado.
const getChatById = async (req, res, next) => {
    try {
        const chat = await chats.findByIdAndUser(req.params.chatId, req.user.id);

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat no encontrado.',
            });
        }

        res.status(200).json({
            success: true,
            data: { chat },
        });
    } catch (error) {
        next(error);
    }
};

// Procesa un mensaje, busca contexto relevante y responde por streaming SSE.
const sendMessage = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const { content, cvAnalysisId } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El mensaje no puede estar vacio.',
            });
        }

        const chat = await chats.findByIdAndUser(chatId, req.user.id);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat no encontrado.',
            });
        }

        let userProfile = null;
        let recommendation = null;
        let messageEmbedding = null;
        let retrieval = null;
        let selectedMasterId = req.user.selectedMasterId || null;
        const analysisId = cvAnalysisId || chat.cvAnalysisId;

        // Si el chat ya tiene un analisis asociado, reutilizamos ese contexto.
        if (analysisId) {
            const analysis = await analyses.findById(analysisId);
            if (analysis && analysis.status === 'completed') {
                userProfile = analysis.extractedProfile;
                recommendation = analysis.recommendation;
                selectedMasterId = analysis.masterId || selectedMasterId;
            }
        }

        try {
            messageEmbedding = await createTextEmbedding(content);
        } catch (embeddingError) {
            req.log?.warn('Embedding no generado para mensaje', {
                userId: req.user.id,
                chatId,
                error: embeddingError.message,
            });
        }

        try {
            retrieval = await retrieveRelevantCourses({
                question: content,
                embeddingResult: messageEmbedding,
                topK: 4,
                filters: selectedMasterId
                    ? {
                        masterIds: [selectedMasterId, 'shared'],
                    }
                    : {},
            });
        } catch (retrievalError) {
            req.log?.warn('Busqueda vectorial omitida en chat', {
                userId: req.user.id,
                chatId,
                masterId: selectedMasterId,
                error: retrievalError.message,
            });
        }

        const userMsg = await chats.addMessage(chatId, {
            role: 'user',
            content: content.trim(),
            metadata: {
                type: 'text',
                embedding: messageEmbedding
                    ? {
                        status: 'generated',
                        model: messageEmbedding.model,
                        dimensions: messageEmbedding.dimensions,
                    }
                    : {
                        status: 'unavailable',
                    },
            },
        });

        const freshChat = await chats.findById(chatId);

        // La primera pregunta sirve como titulo automatico del chat.
        if (!freshChat.titleGenerated && freshChat.messages.length === 1) {
            await chats.update(chatId, {
                title: content.substring(0, 60) + (content.length > 60 ? '...' : ''),
                titleGenerated: true,
            });
        }

        if (cvAnalysisId && !freshChat.cvAnalysisId) {
            await chats.update(chatId, { cvAnalysisId });
        }

        const recentMessages = freshChat.messages.slice(-20).map((message) => ({
            role: message.role,
            content: message.content,
        }));

        res.status(200);
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        writeSseEvent(res, {
            type: 'start',
            chatId,
            userMessage: userMsg,
            retrieval: buildRetrievalPayload(retrieval, messageEmbedding),
        });

        let aiContent = '';

        try {
            for await (const token of streamChatResponse(recentMessages, userProfile, recommendation, retrieval)) {
                aiContent += token;
                writeSseEvent(res, { type: 'token', token });
            }
        } catch (streamError) {
            (req.log || logger).error('Error en streaming de chat', {
                userId: req.user.id,
                chatId,
                error: streamError.message,
            });
            writeSseEvent(res, {
                type: 'error',
                message: 'No pude completar la respuesta en este momento. Intenta de nuevo en unos segundos.',
            });
            return res.end();
        }

        const assistantMsg = await chats.addMessage(chatId, {
            role: 'assistant',
            content: aiContent,
            metadata: {
                type: 'text',
                retrieval: retrieval
                    ? {
                        status: retrieval.matches.length ? 'used' : 'no_matches',
                        matches: retrieval.matches.slice(0, 3).map((match) => ({
                            id: match.id,
                            title: match.title,
                            contentType: match.contentType,
                            moduleTitle: match.moduleTitle,
                            distance: match.distance,
                        })),
                    }
                    : {
                        status: 'unavailable',
                    },
            },
        });

        writeSseEvent(res, {
            type: 'done',
            chatId,
            assistantMessage: assistantMsg,
            retrieval: buildRetrievalPayload(retrieval, messageEmbedding),
        });

        req.log?.info('Mensaje procesado', {
            userId: req.user.id,
            chatId,
            contentLength: content.trim().length,
            responseLength: aiContent.length,
            matchCount: retrieval?.matches?.length || 0,
            embedding: Boolean(messageEmbedding),
        });
        res.end();
    } catch (error) {
        next(error);
    }
};

// Marca el chat como inactivo sin borrar el historial en Firestore.
const deleteChat = async (req, res, next) => {
    try {
        const deleted = await chats.softDelete(req.params.chatId, req.user.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Chat no encontrado.',
            });
        }

        req.log?.info('Chat eliminado', {
            userId: req.user.id,
            chatId: req.params.chatId,
        });

        res.status(200).json({
            success: true,
            message: 'Chat eliminado exitosamente.',
        });
    } catch (error) {
        next(error);
    }
};

// Permite renombrar un chat ya existente del usuario.
const updateChatTitle = async (req, res, next) => {
    try {
        const { title } = req.body;
        const chat = await chats.findByIdAndUser(req.params.chatId, req.user.id);

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat no encontrado.',
            });
        }

        const updated = await chats.update(req.params.chatId, { title });

        req.log?.info('Titulo de chat actualizado', {
            userId: req.user.id,
            chatId: req.params.chatId,
            titleLength: title?.length || 0,
        });

        res.status(200).json({
            success: true,
            data: { chat: updated },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUserChats,
    createChat,
    getChatById,
    sendMessage,
    deleteChat,
    updateChatTitle,
};
