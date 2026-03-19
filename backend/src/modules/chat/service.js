const { AppError } = require('../../shared/errors/app-error');
const { chats, analyses } = require('../../store');
const { createTextEmbedding } = require('../../services/embedding.service');
const { retrieveRelevantCourses } = require('../../services/course-retrieval.service');
const { streamChatResponse } = require('../../services/openai.service');

const listUserChats = async ({ userId, page, limit }) => {
    return chats.findByUserId(userId, { page, limit });
};

const createUserChat = async ({ userId, title, cvAnalysisId }) =>
    chats.create({
        userId,
        title: title || 'Nueva conversacion',
        cvAnalysisId: cvAnalysisId || null,
    });

const getUserChatById = async ({ chatId, userId }) => {
    const chat = await chats.findByIdAndUser(chatId, userId);

    if (!chat) {
        throw new AppError('Chat no encontrado.', 404);
    }

    return chat;
};

const deleteUserChat = async ({ chatId, userId }) => {
    const deleted = await chats.softDelete(chatId, userId);

    if (!deleted) {
        throw new AppError('Chat no encontrado.', 404);
    }

    return true;
};

const renameUserChat = async ({ chatId, userId, title }) => {
    await getUserChatById({ chatId, userId });
    return chats.update(chatId, { title });
};

const streamUserChatMessage = async ({
    chatId,
    user,
    content,
    cvAnalysisId,
    log,
    onStart,
    onToken,
    onError,
    onDone,
}) => {
    const chat = await chats.findByIdAndUser(chatId, user.id);

    if (!chat) {
        throw new AppError('Chat no encontrado.', 404);
    }

    let userProfile = null;
    let recommendation = null;
    let messageEmbedding = null;
    let retrieval = null;
    let selectedMasterId = user.selectedMasterId || null;
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
    } catch (error) {
        log?.warn('Embedding no generado para mensaje', {
            userId: user.id,
            chatId,
            error: error.message,
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
    } catch (error) {
        log?.warn('Busqueda vectorial omitida en chat', {
            userId: user.id,
            chatId,
            masterId: selectedMasterId,
            error: error.message,
        });
    }

    const userMessage = await chats.addMessage(chatId, {
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

    onStart?.({ chatId, userMessage, retrieval, messageEmbedding });

    let aiContent = '';

    try {
        for await (const token of streamChatResponse(recentMessages, userProfile, recommendation, retrieval)) {
            aiContent += token;
            onToken?.(token);
        }
    } catch (error) {
        log?.error('Error en streaming de chat', {
            userId: user.id,
            chatId,
            error: error.message,
        });
        onError?.(error);
        return;
    }

    const assistantMessage = await chats.addMessage(chatId, {
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

    log?.info('Mensaje procesado', {
        userId: user.id,
        chatId,
        contentLength: content.trim().length,
        responseLength: aiContent.length,
        matchCount: retrieval?.matches?.length || 0,
        embedding: Boolean(messageEmbedding),
    });

    onDone?.({ chatId, assistantMessage, retrieval, messageEmbedding, aiContent });
};

module.exports = {
    listUserChats,
    createUserChat,
    getUserChatById,
    deleteUserChat,
    renameUserChat,
    streamUserChatMessage,
};
