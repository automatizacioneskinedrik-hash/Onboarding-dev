const { AppError } = require('../../shared/errors/app-error');
const { serializeStoredRecommendation } = require('../../shared/serializers/recommendation.serializer');
const { analyses, users } = require('../../store');
const { extractTextFromFile } = require('../../services/pdf.service');
const { extractProfileFromCV, generateRecommendation } = require('../../services/openai.service');
const { isValidMasterId } = require('../../utils/masters');

const resolveMasterId = ({ bodyMasterId, userMasterId }) => bodyMasterId || userMasterId || null;

const ensureValidMasterId = (masterId, message) => {
    if (!masterId || !isValidMasterId(masterId)) {
        throw new AppError(message, 400);
    }
};

const createAnalysisRecord = async ({ userId, selectedMasterId, file, sourceType, linkedinUrl, rawText }) => {
    const analysis = await analyses.create({
        userId,
        sourceType,
        masterId: selectedMasterId,
        file: file || null,
        linkedinUrl: linkedinUrl || null,
        rawText: rawText || null,
    });

    await analyses.update(analysis.id, { status: 'processing' });
    return analysis;
};

const buildStoredRecommendation = (recommendation) =>
    serializeStoredRecommendation(recommendation);

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
        extractResult = await extractTextFromFile(file.path, file.originalname);
    } catch (error) {
        await analyses.update(analysis.id, {
            status: 'failed',
            errorMessage: error.message,
        });

        throw new AppError(error.message, 422);
    }

    const { text } = extractResult;

    if (!text || text.length < 50) {
        await analyses.update(analysis.id, {
            status: 'failed',
            errorMessage: 'No se pudo extraer suficiente contenido del archivo.',
        });

        throw new AppError('No se pudo leer el contenido del archivo. Asegurate de que no este vacio y sea un formato valido.', 422);
    }

    let extractedProfile;
    try {
        extractedProfile = await extractProfileFromCV(text);
    } catch (error) {
        await analyses.update(analysis.id, {
            status: 'failed',
            errorMessage: 'Error al extraer perfil con IA',
        });

        throw new AppError('La IA no pudo procesar el contenido del archivo. Intenta con un archivo mas claro.', 502);
    }

    let recommendation;
    try {
        recommendation = await generateRecommendation(extractedProfile, sourceType, {
            masterId: selectedMasterId,
        });
    } catch (error) {
        await analyses.update(analysis.id, {
            status: 'failed',
            errorMessage: 'Error al generar recomendacion',
        });

        throw new AppError('Hubo un error al generar tu recomendacion personalizada.', 502);
    }

    const storedRecommendation = buildStoredRecommendation(recommendation);
    const updated = await analyses.update(analysis.id, {
        rawText: text.substring(0, 5000),
        extractedProfile,
        recommendation: storedRecommendation,
        status: 'completed',
        processedAt: new Date().toISOString(),
    });

    await users.update(user.id, {
        cvAnalysisId: analysis.id,
        selectedMasterId,
        recommendedSpecialization: recommendation?.specialization?.name || recommendation?.primarySpecialization,
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
        log?.info('LinkedIn requiere resumen manual', {
            userId: user.id,
            masterId: selectedMasterId,
            linkedinUrl,
        });

        return {
            requiresManualInput: true,
            message:
                'Para analizar tu perfil de LinkedIn, por favor copia y pega el texto de tu perfil (seccion "Acerca de" y experiencia) en el siguiente mensaje del chat.',
            linkedinUrl,
        };
    }

    const analysis = await createAnalysisRecord({
        userId: user.id,
        selectedMasterId,
        sourceType: 'linkedin',
        linkedinUrl,
        rawText: linkedinSummary,
    });

    const extractedProfile = await extractProfileFromCV(linkedinSummary);
    const recommendation = await generateRecommendation(extractedProfile, 'linkedin', {
        masterId: selectedMasterId,
    });

    const updated = await analyses.update(analysis.id, {
        extractedProfile,
        recommendation: buildStoredRecommendation(recommendation),
        status: 'completed',
        processedAt: new Date().toISOString(),
    });

    await users.update(user.id, {
        cvAnalysisId: analysis.id,
        linkedinUrl,
        selectedMasterId,
        recommendedSpecialization: recommendation.specialization?.name,
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
    const analysis = await analyses.findLatestCompleted(userId);

    if (!analysis) {
        throw new AppError('No se encontro ningun analisis de CV. Por favor sube tu CV.', 404);
    }

    return analysis;
};

const listAnalysisHistory = async ({ userId }) => {
    return analyses.findByUserId(userId);
};

module.exports = {
    uploadCvAnalysis,
    analyzeLinkedinProfile,
    getLatestAnalysis,
    listAnalysisHistory,
};
