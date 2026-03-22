const { AppError } = require('../services/errors/app-error');
const { serializeStoredRecommendation } = require('../services/serialization/recommendation-serializer');
const { buildUserJourneyUpdate } = require('../services/users/user-journey.service');

const resolveMasterId = ({ bodyMasterId, userMasterId }) => bodyMasterId || userMasterId || null;

const createAnalyzeCvUseCases = ({
    analysisRepo,
    userRepo,
    statsRepo,
    masterRepo,
    aiOrchestrator,
    pdfService,
    generateRecommendationForProfile,
}) => {
    const ensureValidMasterId = (masterId, message) => {
        if (!masterId || !masterRepo.isValid(masterId)) {
            throw new AppError(message, 400);
        }
    };

    const createAnalysisRecord = async ({ userId, selectedMasterId, file, sourceType, linkedinUrl, rawText }) => {
        const analysis = await analysisRepo.create({
            userId,
            sourceType,
            masterId: selectedMasterId,
            file: file || null,
            linkedinUrl: linkedinUrl || null,
            rawText: rawText || null,
        });

        await analysisRepo.update(analysis.id, { status: 'processing' });
        return analysis;
    };

    const syncUserAnalysisJourney = async ({
        userId,
        analysisId,
        selectedMasterId,
        recommendedSpecialization,
        processedAt,
        linkedinUrl = undefined,
    }) => {
        const currentUser = await userRepo.findById(userId);
        const analysisCount = await statsRepo.analysisCountByUser(userId);
        const userFields = {
            cvAnalysisId: analysisId,
            selectedMasterId,
            recommendedSpecialization,
        };

        if (linkedinUrl !== undefined) {
            userFields.linkedinUrl = linkedinUrl;
        }

        return userRepo.update(
            userId,
            buildUserJourneyUpdate({
                user: currentUser,
                userFields,
                journeyFields: {
                    latestCompletedAnalysisId: analysisId,
                    analysisCount,
                    lastAnalysisAt: processedAt,
                    lastActivityAt: processedAt,
                },
            })
        );
    };

    const uploadCvAnalysis = async ({ user, bodyMasterId, file, log }) => {
        const selectedMasterId = resolveMasterId({
            bodyMasterId,
            userMasterId: user.selectedMasterId,
        });

        ensureValidMasterId(selectedMasterId, 'Debes seleccionar un master valido antes de subir tu CV.');

        if (!file) {
            throw new AppError('Por favor sube un archivo PDF o CSV con tu informacion.', 400);
        }

        const sourceType = file.originalname.toLowerCase().endsWith('.csv') ? 'csv' : 'pdf';
        const analysis = await createAnalysisRecord({
            userId: user.id,
            selectedMasterId,
            sourceType,
            file: {
                filename: file.filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path,
            },
        });

        log?.info('CV upload iniciado', {
            userId: user.id,
            analysisId: analysis.id,
            masterId: selectedMasterId,
            sourceType,
            fileName: file.originalname,
            fileSize: file.size,
        });

        let extractResult;
        try {
            extractResult = await pdfService.extractTextFromFile(file.path, file.originalname);
        } catch (error) {
            await analysisRepo.update(analysis.id, {
                status: 'failed',
                errorMessage: error.message,
            });

            throw new AppError(error.message, 422);
        }

        const { text } = extractResult;

        if (!text || text.length < 50) {
            await analysisRepo.update(analysis.id, {
                status: 'failed',
                errorMessage: 'No se pudo extraer suficiente contenido del archivo.',
            });

            throw new AppError(
                'No se pudo leer el contenido del archivo. Asegurate de que no este vacio y sea un formato valido.',
                422
            );
        }

        let extractedProfile;
        try {
            extractedProfile = await aiOrchestrator.extractProfile({ cvText: text, log });
        } catch (error) {
            await analysisRepo.update(analysis.id, {
                status: 'failed',
                errorMessage: 'Error al extraer perfil con IA',
            });

            throw new AppError('La IA no pudo procesar el contenido del archivo. Intenta con un archivo mas claro.', 502);
        }

        let recommendation;
        try {
            recommendation = await generateRecommendationForProfile({
                profile: extractedProfile,
                sourceType,
                masterId: selectedMasterId,
                log,
            });
        } catch (error) {
            await analysisRepo.update(analysis.id, {
                status: 'failed',
                errorMessage: 'Error al generar recomendacion',
            });

            throw new AppError('Hubo un error al generar tu recomendacion personalizada.', 502);
        }

        const storedRecommendation = serializeStoredRecommendation(recommendation);
        const processedAt = new Date().toISOString();
        const updated = await analysisRepo.update(analysis.id, {
            rawText: text.substring(0, 5000),
            extractedProfile,
            recommendation: storedRecommendation,
            status: 'completed',
            processedAt,
        });

        await syncUserAnalysisJourney({
            userId: user.id,
            analysisId: updated.id,
            selectedMasterId,
            recommendedSpecialization:
                recommendation?.specialization?.name || recommendation?.primarySpecialization,
            processedAt,
        });

        log?.info('CV procesado', {
            userId: user.id,
            analysisId: updated.id,
            masterId: selectedMasterId,
            matchScore: updated.recommendation.matchScore,
            specializationId: updated.recommendation.primarySpecializationId,
        });

        return {
            analysisId: updated.id,
            masterId: selectedMasterId,
            profile: extractedProfile,
            recommendation: updated.recommendation,
        };
    };

    const analyzeLinkedinProfile = async ({ user, bodyMasterId, linkedinUrl, linkedinSummary, log }) => {
        const selectedMasterId = resolveMasterId({
            bodyMasterId,
            userMasterId: user.selectedMasterId,
        });

        ensureValidMasterId(selectedMasterId, 'Debes seleccionar un master valido antes de analizar tu perfil.');

        if (!linkedinUrl) {
            throw new AppError('Por favor proporciona tu URL de LinkedIn.', 400);
        }

        if (!linkedinSummary || linkedinSummary.length <= 50) {
            const manualResponse = await aiOrchestrator.analyzeLinkedIn({ linkedinUrl, log });

            log?.info('LinkedIn requiere resumen manual', {
                userId: user.id,
                masterId: selectedMasterId,
                linkedinUrl,
            });

            return {
                requiresManualInput: true,
                linkedinUrl,
                ...manualResponse,
            };
        }

        const analysis = await createAnalysisRecord({
            userId: user.id,
            selectedMasterId,
            sourceType: 'linkedin',
            linkedinUrl,
            rawText: linkedinSummary,
        });

        const extractedProfile = await aiOrchestrator.extractProfile({
            cvText: linkedinSummary,
            log,
        });
        const recommendation = await generateRecommendationForProfile({
            profile: extractedProfile,
            sourceType: 'linkedin',
            masterId: selectedMasterId,
            log,
        });

        const processedAt = new Date().toISOString();
        const updated = await analysisRepo.update(analysis.id, {
            extractedProfile,
            recommendation: serializeStoredRecommendation(recommendation),
            status: 'completed',
            processedAt,
        });

        await syncUserAnalysisJourney({
            userId: user.id,
            analysisId: updated.id,
            selectedMasterId,
            recommendedSpecialization: recommendation.specialization?.name,
            processedAt,
            linkedinUrl,
        });

        log?.info('LinkedIn procesado', {
            userId: user.id,
            analysisId: updated.id,
            masterId: selectedMasterId,
            specializationId: updated.recommendation.primarySpecializationId,
            matchScore: updated.recommendation.matchScore,
        });

        return {
            analysisId: updated.id,
            masterId: selectedMasterId,
            profile: extractedProfile,
            recommendation,
        };
    };

    const getLatestAnalysis = async ({ userId }) => {
        const analysis = await analysisRepo.findLatestCompleted(userId);

        if (!analysis) {
            throw new AppError('No se encontro ningun analisis de CV. Por favor sube tu CV.', 404);
        }

        return analysis;
    };

    const listAnalysisHistory = async ({ userId }) => analysisRepo.findByUserId(userId);

    return {
        uploadCvAnalysis,
        analyzeLinkedinProfile,
        getLatestAnalysis,
        listAnalysisHistory,
    };
};

module.exports = {
    createAnalyzeCvUseCases,
};
