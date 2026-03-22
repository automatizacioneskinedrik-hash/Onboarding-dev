const { AppError } = require('../services/errors/app-error');
const { resolveChatJourneyContext } = require('../ai/chat-journey-context');
const {
    CHAT_SCOPE_DECISIONS,
    buildOutOfScopeResponse,
} = require('../ai/chat-domain-policy');
const { buildUserJourneyUpdate } = require('../services/users/user-journey.service');
const { classifyChatIntent } = require('../ai/chat-intent-classifier');
const {
    evaluateChatScope,
    sanitizeMessagesForModel,
} = require('../ai/chat-scope-guard');

const createChatUseCases = ({
    chatRepo,
    analysisRepo,
    userRepo,
    statsRepo,
    contextManager,
    aiOrchestrator,
}) => {
    const listUserChats = async ({ userId, page, limit }) => chatRepo.findByUserId(userId, { page, limit });

    const syncUserChatJourney = async ({ userId, latestChatId, lastChatAt, lastActivityAt }) => {
        const currentUser = await userRepo.findById(userId);
        const chatCount = await statsRepo.chatCountByUser(userId);

        return userRepo.update(
            userId,
            buildUserJourneyUpdate({
                user: currentUser,
                journeyFields: {
                    latestChatId,
                    chatCount,
                    lastChatAt,
                    lastActivityAt,
                },
            })
        );
    };

    const resolveChatContext = async ({ chat, userId }) => {
        let analysis = null;
        let masterId = chat.masterId || null;

        if (chat.cvAnalysisId) {
            const foundAnalysis = await analysisRepo.findById(chat.cvAnalysisId);

            if (foundAnalysis && foundAnalysis.userId === userId && foundAnalysis.status === 'completed') {
                analysis = foundAnalysis;
                masterId = foundAnalysis.masterId || masterId;
            }
        }

        return {
            ...chat,
            masterId,
            analysis,
        };
    };

    const createUserChat = async ({ user, title, cvAnalysisId, masterId }) => {
        const normalizedAnalysisId = typeof cvAnalysisId === 'string' ? cvAnalysisId.trim() : '';
        const normalizedMasterId = typeof masterId === 'string' ? masterId.trim() : '';
        const analysisId = normalizedAnalysisId || null;
        let resolvedMasterId = normalizedMasterId || null;

        if (analysisId) {
            const analysis = await analysisRepo.findById(analysisId);

            if (analysis && analysis.userId === user.id) {
                resolvedMasterId = analysis.masterId || resolvedMasterId;
            }
        }

        const chat = await chatRepo.create({
            userId: user.id,
            title: title || 'Nueva conversacion',
            cvAnalysisId: analysisId,
            masterId: resolvedMasterId,
        });

        await syncUserChatJourney({
            userId: user.id,
            latestChatId: chat.id,
            lastChatAt: chat.createdAt,
            lastActivityAt: chat.createdAt,
        });

        return resolveChatContext({ chat, userId: user.id });
    };

    const getUserChatById = async ({ chatId, userId }) => {
        const chat = await chatRepo.findByIdAndUser(chatId, userId);

        if (!chat) {
            throw new AppError('Chat no encontrado.', 404);
        }

        return resolveChatContext({ chat, userId });
    };

    const deleteUserChat = async ({ chatId, userId }) => {
        const deleted = await chatRepo.softDelete(chatId, userId);

        if (!deleted) {
            throw new AppError('Chat no encontrado.', 404);
        }

        const { items } = await chatRepo.findByUserId(userId, { page: 1, limit: 1 });
        const latestChat = items[0] || null;
        const now = new Date().toISOString();

        await syncUserChatJourney({
            userId,
            latestChatId: latestChat?.id || null,
            lastChatAt: latestChat?.updatedAt || null,
            lastActivityAt: now,
        });

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
        let selectedMasterId = chat.masterId || null;
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
            await chatRepo.update(chatId, {
                cvAnalysisId,
                masterId: selectedMasterId || freshChat.masterId || null,
            });
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
