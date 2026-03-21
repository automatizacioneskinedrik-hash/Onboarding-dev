const { AppError } = require('../services/errors/app-error');
const { resolveChatJourneyContext } = require('../ai/chat-journey-context');
const {
    CHAT_SCOPE_DECISIONS,
    buildOutOfScopeResponse,
} = require('../ai/chat-domain-policy');
const { classifyChatIntent } = require('../ai/chat-intent-classifier');
const {
    evaluateChatScope,
    sanitizeMessagesForModel,
} = require('../ai/chat-scope-guard');

const createChatUseCases = ({
    chatRepo,
    analysisRepo,
    contextManager,
    aiOrchestrator,
}) => {
    const listUserChats = async ({ userId, page, limit }) => chatRepo.findByUserId(userId, { page, limit });

    const createUserChat = async ({ user, title, cvAnalysisId }) => {
        const analysisId = cvAnalysisId || user?.cvAnalysisId || null;

        return chatRepo.create({
            userId: user.id,
            title: title || 'Nueva conversacion',
            cvAnalysisId: analysisId,
        });
    };

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

        const nextUserMessageCount = chat.messages.filter((message) => message.role === 'user').length + 1;
        const chatJourneyContext = resolveChatJourneyContext({
            userName: user?.name,
            selectedMasterId,
            cvAnalysisId: analysisId,
            userProfile,
            recommendation,
            userMessageCount: nextUserMessageCount,
        });
        const classification = classifyChatIntent({
            message: content,
            recentMessages: chat.messages,
        });
        const scopeEvaluation = evaluateChatScope({
            recentMessages: chat.messages,
            classification,
        });
        const scopeMetadata = {
            intent: classification.intent,
            decision:
                scopeEvaluation.state === 'safe'
                    ? classification.decision
                    : CHAT_SCOPE_DECISIONS.REJECT,
            classifierReason: classification.reason,
            guardState: scopeEvaluation.state,
            guardReason: scopeEvaluation.reason,
            topicGroups: Object.keys(classification.topicMatches || {}),
        };

        if (scopeMetadata.decision !== CHAT_SCOPE_DECISIONS.REJECT) {
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
        }

        const userMessage = await chatRepo.addMessage(chatId, {
            role: 'user',
            content: content.trim(),
            metadata: {
                type: 'text',
                scope: scopeMetadata,
                embedding: messageEmbedding
                    ? {
                        status: 'generated',
                        model: messageEmbedding.model,
                        dimensions: messageEmbedding.dimensions,
                    }
                    : {
                        status:
                            scopeMetadata.decision === CHAT_SCOPE_DECISIONS.REJECT
                                ? 'skipped_scope_guard'
                                : 'unavailable',
                    },
            },
        });

        const freshChat = await chatRepo.findById(chatId);

        const userMessageCount = freshChat.messages.filter((message) => message.role === 'user').length;

        if (!freshChat.titleGenerated && userMessageCount === 1) {
            await chatRepo.update(chatId, {
                title: content.substring(0, 60) + (content.length > 60 ? '...' : ''),
                titleGenerated: true,
            });
        }

        if (cvAnalysisId && !freshChat.cvAnalysisId) {
            await chatRepo.update(chatId, { cvAnalysisId });
        }

        onStart?.({ chatId, userMessage, retrieval, messageEmbedding });

        if (scopeMetadata.decision === CHAT_SCOPE_DECISIONS.REJECT) {
            const rejectionReason =
                scopeEvaluation.reason === 'prompt_injection'
                    ? 'prompt_injection'
                    : scopeEvaluation.reason || classification.intent;
            const aiContent = buildOutOfScopeResponse({
                reason: rejectionReason,
            });

            onToken?.(aiContent);

            const assistantMessage = await chatRepo.addMessage(chatId, {
                role: 'assistant',
                content: aiContent,
                metadata: {
                    type: 'text',
                    scope: {
                        intent: classification.intent,
                        decision: CHAT_SCOPE_DECISIONS.REJECT,
                        classifierReason: classification.reason,
                        guardState: scopeEvaluation.state,
                        guardReason: scopeEvaluation.reason,
                        policy: 'lar_only',
                    },
                    retrieval: {
                        status: 'skipped_scope_guard',
                    },
                },
            });

            log?.info('Mensaje bloqueado por scope', {
                userId: user.id,
                chatId,
                intent: classification.intent,
                guardState: scopeEvaluation.state,
            });

            onDone?.({ chatId, assistantMessage, retrieval: null, messageEmbedding: null, aiContent });
            return;
        }

        const recentMessages = sanitizeMessagesForModel(freshChat.messages)
            .slice(-20)
            .map((message) => ({
                role: message.role,
                content: message.content,
            }));

        let aiContent = '';

        try {
            for await (const token of aiOrchestrator.streamChatResponse({
                messages: recentMessages,
                userProfile,
                recommendation,
                retrieval,
                chatJourneyContext,
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
                scope: {
                    intent: classification.intent,
                    decision: CHAT_SCOPE_DECISIONS.ALLOW,
                    classifierReason: classification.reason,
                    guardState: scopeEvaluation.state,
                    policy: 'lar_only',
                },
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
            intent: classification.intent,
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
