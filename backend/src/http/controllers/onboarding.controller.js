/**
 * Onboarding Controller
 * MVP: reads and updates global onboarding settings directly from Firestore.
 */

const { sendSuccess, sendError } = require('../respond');
const {
    DEFAULT_MAX_CHAT_INTERACTIONS,
    readOnboardingSettings,
    writeOnboardingSettings,
} = require('../../services/settings/onboarding-settings.service');

const MIN_MAX_CHAT_INTERACTIONS = 1;
const MAX_MAX_CHAT_INTERACTIONS = 100;

const normalizeMaxChatInteractions = (value) => {
    const parsed = Number(value);

    if (!Number.isInteger(parsed)) {
        return DEFAULT_MAX_CHAT_INTERACTIONS;
    }

    return Math.min(MAX_MAX_CHAT_INTERACTIONS, Math.max(MIN_MAX_CHAT_INTERACTIONS, parsed));
};

const normalizeUpdatedAt = (updatedAt) => {
    if (!updatedAt) return null;
    if (typeof updatedAt === 'string') return updatedAt;
    if (typeof updatedAt.toDate === 'function') return updatedAt.toDate().toISOString();
    if (updatedAt instanceof Date) return updatedAt.toISOString();
    return updatedAt;
};

const getOnboardingVideo = async (req, res, next) => {
    try {
        const data = await readOnboardingSettings();

        return sendSuccess(res, {
            data: {
                introVideoUrl: data.introVideoUrl || null,
                introVideoEnabled: Boolean(data.introVideoEnabled),
                maxChatInteractions: normalizeMaxChatInteractions(data.maxChatInteractions),
                updatedAt: normalizeUpdatedAt(data.updatedAt),
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateOnboardingVideo = async (req, res, next) => {
    try {
        const { introVideoUrl, introVideoEnabled, maxChatInteractions } = req.body;

        if (req.user?.role !== 'admin') {
            return sendError(res, {
                statusCode: 403,
                message: 'No tienes permisos para realizar esta accion.',
                requestId: req.requestId,
            });
        }

        if (typeof introVideoUrl !== 'string') {
            return sendError(res, {
                statusCode: 400,
                message: 'introVideoUrl debe ser string.',
                requestId: req.requestId,
            });
        }

        if (typeof introVideoEnabled !== 'boolean') {
            return sendError(res, {
                statusCode: 400,
                message: 'introVideoEnabled debe ser boolean.',
                requestId: req.requestId,
            });
        }

        if (maxChatInteractions !== undefined) {
            const parsedMaxInteractions = Number(maxChatInteractions);

            if (
                !Number.isInteger(parsedMaxInteractions)
                || parsedMaxInteractions < MIN_MAX_CHAT_INTERACTIONS
                || parsedMaxInteractions > MAX_MAX_CHAT_INTERACTIONS
            ) {
                return sendError(res, {
                    statusCode: 400,
                    message: `maxChatInteractions debe ser un entero entre ${MIN_MAX_CHAT_INTERACTIONS} y ${MAX_MAX_CHAT_INTERACTIONS}.`,
                    requestId: req.requestId,
                });
            }
        }

        if (introVideoEnabled === true) {
            const trimmedIntroVideoUrl = introVideoUrl.trim();

            if (!trimmedIntroVideoUrl) {
                return sendError(res, {
                    statusCode: 400,
                    message: 'introVideoUrl debe ser una URL valida.',
                    requestId: req.requestId,
                });
            }

            try {
                new URL(trimmedIntroVideoUrl);
            } catch (error) {
                return sendError(res, {
                    statusCode: 400,
                    message: 'introVideoUrl debe ser una URL valida.',
                    requestId: req.requestId,
                });
            }
        }

        const updatePayload = {
            introVideoUrl,
            introVideoEnabled,
        };

        if (maxChatInteractions !== undefined) {
            updatePayload.maxChatInteractions = Number(maxChatInteractions);
        }

        await writeOnboardingSettings({
            patch: updatePayload,
            updatedBy: req.user.id || req.user.email || null,
        });

        return sendSuccess(res, {
            message: 'Configuracion actualizada',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getOnboardingVideo,
    updateOnboardingVideo,
};
