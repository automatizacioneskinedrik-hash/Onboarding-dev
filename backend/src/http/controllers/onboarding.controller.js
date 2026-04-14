/**
 * Onboarding Controller
 * MVP: reads and updates global onboarding settings directly from Firestore.
 */

const { createFirestoreClient } = require('../../infra/firestore.client');
const { sendSuccess, sendError } = require('../respond');

const { db } = createFirestoreClient();

const SETTINGS_COLLECTION = 'settings';
const ONBOARDING_VIDEO_DOC = 'onboardingVideo';

const getOnboardingVideoRef = () => db.collection(SETTINGS_COLLECTION).doc(ONBOARDING_VIDEO_DOC);

const normalizeUpdatedAt = (updatedAt) => {
    if (!updatedAt) return null;
    if (typeof updatedAt === 'string') return updatedAt;
    if (typeof updatedAt.toDate === 'function') return updatedAt.toDate().toISOString();
    if (updatedAt instanceof Date) return updatedAt.toISOString();
    return updatedAt;
};

const getOnboardingVideo = async (req, res, next) => {
    try {
        const doc = await getOnboardingVideoRef().get();

        if (!doc.exists) {
            return sendSuccess(res, {
                data: {
                    introVideoUrl: null,
                    introVideoEnabled: false,
                },
            });
        }

        const data = doc.data();

        return sendSuccess(res, {
            data: {
                introVideoUrl: data.introVideoUrl || null,
                introVideoEnabled: Boolean(data.introVideoEnabled),
                updatedAt: normalizeUpdatedAt(data.updatedAt),
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateOnboardingVideo = async (req, res, next) => {
    try {
        const { introVideoUrl, introVideoEnabled } = req.body;

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

        await getOnboardingVideoRef().set(
            {
                introVideoUrl,
                introVideoEnabled,
                updatedBy: req.user.id || req.user.email || null,
                updatedAt: new Date().toISOString(),
            },
            { merge: true }
        );

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
