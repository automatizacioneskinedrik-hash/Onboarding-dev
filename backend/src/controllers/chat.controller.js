/**
 * Chat Controller
 * Delegates chat flows to the chat module.
 */

const { createLogger } = require('../logging/logger');
const { initSse, writeSseEvent } = require('../shared/http/sse');
const { sendSuccess } = require('../shared/http/respond');
const { serializeChatList, serializeRetrieval } = require('../modules/chat/serializer');
const {
    listUserChats,
    createUserChat,
    getUserChatById,
    deleteUserChat,
    renameUserChat,
    streamUserChatMessage,
} = require('../modules/chat/service');

const logger = createLogger({ component: 'controller.chat' });

const getUserChats = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const result = await listUserChats({ userId: req.user.id, page, limit });

        return sendSuccess(res, {
            data: serializeChatList({ ...result, page, limit }),
        });
    } catch (error) {
        next(error);
    }
};

const createChat = async (req, res, next) => {
    try {
        const chat = await createUserChat({
            userId: req.user.id,
            title: req.body.title,
            cvAnalysisId: req.body.cvAnalysisId,
        });

        req.log?.info('Chat creado', {
            userId: req.user.id,
            chatId: chat.id,
            cvAnalysisId: req.body.cvAnalysisId || null,
        });

        return sendSuccess(res, {
            statusCode: 201,
            message: 'Chat creado exitosamente.',
            data: { chat },
        });
    } catch (error) {
        next(error);
    }
};

const getChatById = async (req, res, next) => {
    try {
        const chat = await getUserChatById({
            chatId: req.params.chatId,
            userId: req.user.id,
        });

        return sendSuccess(res, {
            data: { chat },
        });
    } catch (error) {
        next(error);
    }
};

const sendMessage = async (req, res, next) => {
    try {
        let sseInitialized = false;
        const ensureSse = () => {
            if (!sseInitialized) {
                initSse(res);
                sseInitialized = true;
            }
        };

        await streamUserChatMessage({
            chatId: req.params.chatId,
            user: req.user,
            content: req.body.content,
            cvAnalysisId: req.body.cvAnalysisId,
            log: req.log || logger,
            onStart: ({ chatId, userMessage, retrieval, messageEmbedding }) => {
                ensureSse();
                writeSseEvent(res, {
                    type: 'start',
                    chatId,
                    userMessage,
                    retrieval: serializeRetrieval(retrieval, messageEmbedding),
                });
            },
            onToken: (token) => {
                ensureSse();
                writeSseEvent(res, { type: 'token', token });
            },
            onError: () => {
                ensureSse();
                writeSseEvent(res, {
                    type: 'error',
                    message: 'No pude completar la respuesta en este momento. Intenta de nuevo en unos segundos.',
                });
                res.end();
            },
            onDone: ({ chatId, assistantMessage, retrieval, messageEmbedding }) => {
                ensureSse();
                writeSseEvent(res, {
                    type: 'done',
                    chatId,
                    assistantMessage,
                    retrieval: serializeRetrieval(retrieval, messageEmbedding),
                });
                res.end();
            },
        });
    } catch (error) {
        next(error);
    }
};

const deleteChat = async (req, res, next) => {
    try {
        await deleteUserChat({
            chatId: req.params.chatId,
            userId: req.user.id,
        });

        req.log?.info('Chat eliminado', {
            userId: req.user.id,
            chatId: req.params.chatId,
        });

        return sendSuccess(res, {
            message: 'Chat eliminado exitosamente.',
        });
    } catch (error) {
        next(error);
    }
};

const updateChatTitle = async (req, res, next) => {
    try {
        const chat = await renameUserChat({
            chatId: req.params.chatId,
            userId: req.user.id,
            title: req.body.title,
        });

        req.log?.info('Titulo de chat actualizado', {
            userId: req.user.id,
            chatId: req.params.chatId,
            titleLength: req.body.title?.length || 0,
        });

        return sendSuccess(res, {
            data: { chat },
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
