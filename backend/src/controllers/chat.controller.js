/**
 * Chat Controller
 * Uses Firestore (via Store Index).
 */

const { chats, analyses } = require('../store');
const { streamChatResponse } = require('../services/openai.service');
const { createTextEmbedding } = require('../services/embedding.service');
const { retrieveRelevantCourses } = require('../services/course-retrieval.service');

const buildRetrievalPayload = (retrieval, messageEmbedding) => ({
    embeddingGenerated: Boolean(messageEmbedding),
    embeddingModel: messageEmbedding?.model || null,
    embeddingDimensions: messageEmbedding?.dimensions || null,
    vectorSearchUsed: Boolean(retrieval),
    matches: retrieval?.matches.slice(0, 3).map((match) => ({
        id: match.id,
        title: match.title,
        contentType: match.contentType,
        moduleTitle: match.moduleTitle,
        distance: match.distance,
    })) || [],
});

const writeSseEvent = (res, payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

/**
 * GET /api/chat
 */
const getUserChats = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

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

/**
 * POST /api/chat
 */
const createChat = async (req, res, next) => {
    try {
        const { title, cvAnalysisId } = req.body;

        const chat = await chats.create({
            userId: req.user.id,
            title: title || 'Nueva conversación',
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

/**
 * GET /api/chat/:chatId
 */
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

/**
 * POST /api/chat/:chatId/message
 */
const sendMessage = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const { content, cvAnalysisId } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El mensaje no puede estar vacío.',
            });
        }

        const chat = await chats.findByIdAndUser(chatId, req.user.id);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat no encontrado.',
            });
        }

        // Resolve CV analysis context
        let userProfile = null;
        let recommendation = null;
        let messageEmbedding = null;
        let retrieval = null;
        let selectedMasterId = req.user.selectedMasterId || null;
        const analysisId = cvAnalysisId || chat.cvAnalysisId;

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
            console.warn('Embedding generation skipped:', embeddingError.message);
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
            console.warn('Vector retrieval skipped:', retrievalError.message);
        }

        // Add user message
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

        // Get fresh chat state for OpenAI
        const freshChat = await chats.findById(chatId);

        // Auto-title from first message
        if (!freshChat.titleGenerated && freshChat.messages.length === 1) {
            await chats.update(chatId, {
                title: content.substring(0, 60) + (content.length > 60 ? '...' : ''),
                titleGenerated: true,
            });
        }

        // Update cvAnalysisId on chat if provided
        if (cvAnalysisId && !freshChat.cvAnalysisId) {
            await chats.update(chatId, { cvAnalysisId });
        }

        // Build recent message history for OpenAI (last 20)
        const recentMessages = freshChat.messages.slice(-20).map((m) => ({
            role: m.role,
            content: m.content,
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
            console.error('Chat streaming error:', streamError.message);
            writeSseEvent(res, {
                type: 'error',
                message: 'No pude completar la respuesta en este momento. Intenta de nuevo en unos segundos.',
            });
            return res.end();
        }

        // Add assistant message
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
        res.end();
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/chat/:chatId
 */
const deleteChat = async (req, res, next) => {
    try {
        const deleted = await chats.softDelete(req.params.chatId, req.user.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Chat no encontrado.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Chat eliminado exitosamente.',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/chat/:chatId/title
 */
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
