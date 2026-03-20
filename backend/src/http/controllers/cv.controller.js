/**
 * CV Controller
 * Delegates CV analysis flows to the cv module.
 */

const { createLogger } = require('../../services/observability/logger');
const { getAppContainer } = require('../../composition-root');
const { sendSuccess } = require('../respond');
const {
    serializeCompletedAnalysis,
    serializeLinkedinAnalysis,
    serializeAnalysisHistory,
} = require('../serializers/cv.serializer');

const logger = createLogger({ component: 'controller.cv' });
const getUseCases = () => getAppContainer().useCases;

const uploadCV = async (req, res, next) => {
    try {
        const result = await getUseCases().uploadCvAnalysis({
            user: req.user,
            bodyMasterId: req.body.masterId,
            file: req.file,
            log: req.log || logger,
        });

        return sendSuccess(res, {
            message: 'Analisis completado exitosamente',
            data: serializeCompletedAnalysis(result),
        });
    } catch (error) {
        if (error.statusCode >= 500) {
            (req.log || logger).error('Error fatal en upload de CV', {
                userId: req.user?.id,
                error: error.message,
            });
        }

        next(error);
    }
};

const analyzeLinkedIn = async (req, res, next) => {
    try {
        const result = await getUseCases().analyzeLinkedinProfile({
            user: req.user,
            bodyMasterId: req.body.masterId,
            linkedinUrl: req.body.linkedinUrl,
            linkedinSummary: req.body.linkedinSummary,
            log: req.log || logger,
        });

        if (result.requiresManualInput) {
            return sendSuccess(res, result);
        }

        return sendSuccess(res, {
            message: 'Perfil de LinkedIn analizado exitosamente.',
            data: serializeLinkedinAnalysis(result),
        });
    } catch (error) {
        next(error);
    }
};

const getMyAnalysis = async (req, res, next) => {
    try {
        const analysis = await getUseCases().getLatestAnalysis({ userId: req.user.id });

        return sendSuccess(res, {
            data: { analysis },
        });
    } catch (error) {
        next(error);
    }
};

const getAnalysisHistory = async (req, res, next) => {
    try {
        const analyses = await getUseCases().listAnalysisHistory({ userId: req.user.id });

        return sendSuccess(res, {
            data: {
                analyses: serializeAnalysisHistory(analyses),
                total: analyses.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { uploadCV, analyzeLinkedIn, getMyAnalysis, getAnalysisHistory };
