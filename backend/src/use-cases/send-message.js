const { AppError } = require('../services/errors/app-error');

const createChatUseCases = ({
    chatRepo,
    analysisRepo,
    contextManager,
    aiOrchestrator,
}) => {
    const listUserChats = async ({ userId, page, limit }) => chatRepo.findByUserId(userId, { page, limit });

    const createUserChat = async ({ userId, title, cvAnalysisId }) =>
        chatRepo.create({
            userId,
            title: title || 'Nueva conversacion',
            cvAnalysisId: cvAnalysisId || null,
        });

    const getUserChatById = async ({ chatId, userId }) => {
        const chat = await chatRepo.findByIdAndUser(chatId, userId);

        if (!chat) {
            throw new AppError('Chat no encontrado.', 404);
        }

        return chat;
    };

    const deleteUserChat = async ({ chatId, userId }) => {
        const deleted = await chatRepo.softDelete(chatId, userId);

        if (!deleted) {
            throw new AppError('Chat no encontrado.', 404);
        }

        return true;
    };

    const renameUserChat = async ({ chatId, userId, title }) => {
        await getUserChatById({ chatId, userId });
        return chatRepo.update(chatId, { title });
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
        const chat = await chatRepo.findByIdAndUser(chatId, user.id);

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
            const analysis = await analysisRepo.findById(analysisId);
            if (analysis && analysis.status === 'completed') {
                userProfile = analysis.extractedProfile;
                recommendation = analysis.recommendation;
                selectedMasterId = analysis.masterId || selectedMasterId;
            }
        }

        try {
            messageEmbedding = await contextManager.createTextEmbedding(content);
        } catch (error) {
            log?.warn('Embedding no generado para mensaje', {
                userId: user.id,
                chatId,
                error: error.message,
            });
        }

        try {
            retrieval = await contextManager.retrieveRelevantCourses({
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

        const userMessage = await chatRepo.addMessage(chatId, {
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

        const freshChat = await chatRepo.findById(chatId);

        if (!freshChat.titleGenerated && freshChat.messages.length === 1) {
            await chatRepo.update(chatId, {
                title: content.substring(0, 60) + (content.length > 60 ? '...' : ''),
                titleGenerated: true,
            });
        }

        if (cvAnalysisId && !freshChat.cvAnalysisId) {
            await chatRepo.update(chatId, { cvAnalysisId });
        }

        const recentMessages = freshChat.messages.slice(-20).map((message) => ({
            role: message.role,
            content: message.content,
        }));

        onStart?.({ chatId, userMessage, retrieval, messageEmbedding });

        let aiContent = '';

        try {
            for await (const token of aiOrchestrator.streamChatResponse({
                messages: recentMessages,
                userProfile,
                recommendation,
                retrieval,
                log,
            })) {
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

        const assistantMessage = await chatRepo.addMessage(chatId, {
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

    return {
        listUserChats,
        createUserChat,
        getUserChatById,
        deleteUserChat,
        renameUserChat,
        streamUserChatMessage,
    };
};

module.exports = {
    createChatUseCases,
};
