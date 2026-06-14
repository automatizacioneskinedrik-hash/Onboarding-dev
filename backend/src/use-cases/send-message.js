const { AppError } = require('../services/errors/app-error');
const { resolveChatJourneyContext } = require('../ai/chat-journey-context');
const {
    CHAT_SCOPE_DECISIONS,
    buildOutOfScopeResponse,
    resolveRequestedMasterId,
} = require('../ai/chat-domain-policy');
const { buildUserJourneyUpdate } = require('../services/users/user-journey.service');
const { normalizeRecommendation, serializeStoredRecommendation } = require('../services/serialization/recommendation-serializer');
const { classifyChatIntent } = require('../ai/chat-intent-classifier');
const {
    evaluateChatScope,
    sanitizeMessagesForModel,
} = require('../ai/chat-scope-guard');
const {
    DEFAULT_MAX_CHAT_INTERACTIONS,
    readOnboardingSettings,
} = require('../services/settings/onboarding-settings.service');

const SETTINGS_CACHE_TTL_MS = 30000;

const maxInteractionsCache = {
    value: DEFAULT_MAX_CHAT_INTERACTIONS,
    expiresAt: 0,
};

const normalizeMaxInteractions = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return DEFAULT_MAX_CHAT_INTERACTIONS;
    }

    return parsed;
};

const resolveMaxUserInteractions = async () => {
    if (Date.now() < maxInteractionsCache.expiresAt) {
        return maxInteractionsCache.value;
    }

    try {
        const settings = await readOnboardingSettings();
        maxInteractionsCache.value = normalizeMaxInteractions(settings?.maxChatInteractions);
    } catch {
        maxInteractionsCache.value = maxInteractionsCache.value || DEFAULT_MAX_CHAT_INTERACTIONS;
    } finally {
        maxInteractionsCache.expiresAt = Date.now() + SETTINGS_CACHE_TTL_MS;
    }

    return maxInteractionsCache.value;
};

const createChatUseCases = ({
    chatRepo,
    analysisRepo,
    userRepo,
    masterRepo,
    statsRepo,
    contextManager,
    aiOrchestrator,
}) => {
    const listUserChats = async ({ userId, page, limit }) => chatRepo.findByUserId(userId, { page, limit });

    // Mantiene el "journey" del usuario alineado con la actividad real del chat para que
    // onboarding y analitica lean una sola fuente de verdad.
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

    // Solo adjunta analisis cuando pertenece al mismo usuario y ya esta completado; asi
    // evitamos inyectar contexto ajeno o incompleto en la conversacion.
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

    // Si el chat nace desde un analisis, heredamos su master para no perder el anclaje con
    // el sprint y con el retrieval contextual.
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

    const applyMasterChange = async ({ chat, user, selectedMasterId, analysis, log }) => {
        const targetMaster = masterRepo?.getById(selectedMasterId) || null;

        if (!targetMaster) {
            throw new AppError('No se pudo resolver el Master solicitado.', 400);
        }

        let updatedAnalysis = analysis || null;
        let updatedRecommendation = analysis?.recommendation || null;

        if (analysis?.status === 'completed' && analysis.extractedProfile) {
            const generatedRecommendation = await aiOrchestrator.generateRecommendation({
                profile: analysis.extractedProfile,
                sourceType: analysis.sourceType || 'chat',
                options: { masterId: targetMaster.id },
                log,
            });

            updatedRecommendation = normalizeRecommendation(generatedRecommendation);
            updatedAnalysis = await analysisRepo.update(analysis.id, {
                masterId: targetMaster.id,
                recommendation: serializeStoredRecommendation(updatedRecommendation),
            });
        }

        const currentUser = await userRepo.findById(user.id);
        const now = new Date().toISOString();
        const activeAnalysisId = updatedAnalysis?.id || currentUser.cvAnalysisId || chat.cvAnalysisId || null;
        const recommendedSpecialization =
            updatedRecommendation?.specialization?.name ||
            updatedRecommendation?.primarySpecialization ||
            currentUser.recommendedSpecialization ||
            null;

        const updatedUser = await userRepo.update(
            user.id,
            buildUserJourneyUpdate({
                user: currentUser,
                userFields: {
                    selectedMasterId: targetMaster.id,
                    cvAnalysisId: activeAnalysisId,
                    recommendedSpecialization,
                },
                journeyFields: {
                    lastActivityAt: now,
                },
            })
        );

        const updatedChat = await chatRepo.update(chat.id, {
            masterId: targetMaster.id,
            cvAnalysisId: activeAnalysisId,
        });

        return {
            targetMaster,
            updatedAnalysis,
            updatedRecommendation,
            updatedUser,
            updatedChat,
        };
    };

    const buildMasterChangeResponse = ({ targetMaster, recommendation }) => {
        const routeSubjects = (recommendation?.subjects || []).slice(0, 6);
        const routeSummary = routeSubjects.length ? routeSubjects.join(', ') : 'la ruta sugerida';
        const specializationName = recommendation?.primarySpecialization || targetMaster?.name || 'el nuevo Master';

        return [
            `He ajustado tu perfil al ${targetMaster?.name || 'nuevo Master'} y ya reorganicé tu ruta para que quede alineada con este enfoque.`,
            `La especializacion principal ahora es ${specializationName} y los sprints prioritarios son: ${routeSummary}.`,
            'Si quieres, puedo afinar todavía más la ruta para priorizar finanzas, analitica o liderazgo dentro de este nuevo contexto.',
        ].join('\n\n');
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

    // Este flujo concentra varias responsabilidades no obvias:
    // 1. resuelve contexto de analisis,
    // 2. aplica guardrails de dominio,
    // 3. intenta retrieval local sin volver fatal un fallo auxiliar,
    // 4. persiste metadata suficiente para auditoria del chat.
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
        let retrieval = null;
        let selectedMasterId = chat.masterId || user.selectedMasterId || null;
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
        const maxUserInteractions = await resolveMaxUserInteractions();

        if (nextUserMessageCount > maxUserInteractions) {
            const remainingInteractions = Math.max(0, maxUserInteractions - (nextUserMessageCount - 1));
            const aiContent = `Has alcanzado el limite de ${maxUserInteractions} interacciones para definir tu ruta de sprints. Si quieres, puedo ayudarte a resumir lo avanzado y priorizar los siguientes pasos con lo que ya tenemos.`;

            const assistantMessage = await chatRepo.addMessage(chatId, {
                role: 'assistant',
                content: aiContent,
                metadata: {
                    type: 'text',
                    scope: {
                        intent: 'interaction_limit',
                        decision: CHAT_SCOPE_DECISIONS.ALLOW,
                        policy: 'interaction_limit_20',
                    },
                    interactionLimit: {
                        max: maxUserInteractions,
                        remaining: remainingInteractions,
                    },
                },
            });

            onStart?.({ chatId, userMessage: null, retrieval: null });
            onToken?.(aiContent);
            onDone?.({ chatId, assistantMessage, retrieval: null, aiContent });
            return;
        }

        const chatJourneyContext = resolveChatJourneyContext({
            userName: user?.name,
            selectedMasterId,
            cvAnalysisId: analysisId,
            userProfile,
            recommendation,
            userMessageCount: nextUserMessageCount,
            maxUserInteractions,
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

        const masterChangeRequested = classification.intent === 'lar_master_change';
        const requestedMasterId = classification.requestedMasterId || resolveRequestedMasterId(content, selectedMasterId);

        if (masterChangeRequested && requestedMasterId) {
            try {
                const masterChangeResult = await applyMasterChange({
                    chat,
                    user,
                    selectedMasterId: requestedMasterId,
                    analysis: analysisId ? await analysisRepo.findById(analysisId) : null,
                    log,
                });

                const aiContent = buildMasterChangeResponse({
                    targetMaster: masterChangeResult.targetMaster,
                    recommendation: masterChangeResult.updatedRecommendation,
                });

                onStart?.({ chatId, userMessage: null, retrieval: null });
                onToken?.(aiContent);

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
                            policy: 'master_change_route_update',
                        },
                        chatAction: {
                            type: 'master_change',
                            masterId: masterChangeResult.targetMaster.id,
                        },
                        chatContext: {
                            chatId,
                            masterId: masterChangeResult.updatedChat.masterId,
                            cvAnalysisId: masterChangeResult.updatedChat.cvAnalysisId || null,
                            analysis: masterChangeResult.updatedAnalysis || null,
                        },
                    },
                });

                log?.info('Master actualizado desde chat', {
                    userId: user.id,
                    chatId,
                    targetMasterId: masterChangeResult.targetMaster.id,
                });

                onDone?.({
                    chatId,
                    assistantMessage,
                    retrieval: null,
                    aiContent,
                    chatContext: {
                        chatId,
                        masterId: masterChangeResult.updatedChat.masterId,
                        cvAnalysisId: masterChangeResult.updatedChat.cvAnalysisId || null,
                        analysis: masterChangeResult.updatedAnalysis || null,
                    },
                });
                return;
            } catch (error) {
                log?.warn('No se pudo aplicar el cambio de Master desde chat', {
                    userId: user.id,
                    chatId,
                    error: error.message,
                });
            }
        }

        // El retrieval local enriquece la respuesta, pero si falla el chat sigue operando
        // con el contexto conversacional ya disponible.
        if (scopeMetadata.decision !== CHAT_SCOPE_DECISIONS.REJECT) {
            try {
                retrieval = await contextManager.retrieveRelevantCourses({
                    question: content,
                    masterId: selectedMasterId || null,
                    topK: 4,
                });
            } catch (error) {
                log?.warn('Retrieval local omitido en chat', {
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
            },
        });

        const freshChat = await chatRepo.findById(chatId);

        const userMessageCount = freshChat.messages.filter((message) => message.role === 'user').length;

        // Solo autogeneramos el titulo una vez para no sobrescribir nombres puestos por el usuario.
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
        } else if (!freshChat.masterId && selectedMasterId) {
            await chatRepo.update(chatId, {
                masterId: selectedMasterId,
            });
        }

        onStart?.({ chatId, userMessage, retrieval });

        // Incluso cuando bloqueamos por scope, dejamos el intento y la respuesta controlada
        // guardados para mantener el historial consistente.
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

            onDone?.({ chatId, assistantMessage, retrieval: null, aiContent });
            return;
        }

        // Antes de llamar al modelo filtramos mensajes rechazados para no reinyectar
        // contenido que ya habiamos decidido excluir del dominio.
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
            intent: classification.intent,
        });

        onDone?.({ chatId, assistantMessage, retrieval, aiContent });
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
