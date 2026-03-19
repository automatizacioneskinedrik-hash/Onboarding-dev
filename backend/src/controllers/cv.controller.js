/**
 * CV Controller
 * Uses Firestore (via Store Index).
 */

const { analyses, users } = require('../store');
const { createLogger } = require('../logging/logger');
const { extractTextFromFile } = require('../services/pdf.service');
const { extractProfileFromCV, generateRecommendation } = require('../services/openai.service');
const { isValidMasterId } = require('../utils/masters');

const logger = createLogger({ component: 'controller.cv' });

// Sube un CV, extrae el texto, analiza el perfil y guarda la recomendacion final.
const uploadCV = async (req, res, next) => {
    try {
        const selectedMasterId = req.body.masterId || req.user.selectedMasterId || null;

        if (!selectedMasterId || !isValidMasterId(selectedMasterId)) {
            return res.status(400).json({
                success: false,
                message: 'Debes seleccionar un master valido antes de subir tu CV.',
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Por favor sube un archivo PDF o CSV con tu informacion.',
            });
        }

        const filePath = req.file.path;
        const filename = req.file.originalname;

        const analysis = await analyses.create({
            userId: req.user.id,
            sourceType: filename.toLowerCase().endsWith('.csv') ? 'csv' : 'pdf',
            masterId: selectedMasterId,
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: filePath,
            },
        });

        await analyses.update(analysis.id, { status: 'processing' });

        req.log?.info('CV upload iniciado', {
            userId: req.user.id,
            analysisId: analysis.id,
            masterId: selectedMasterId,
            sourceType: analysis.sourceType,
            fileName: req.file.originalname,
            fileSize: req.file.size,
        });

        // El analisis se persiste desde el inicio para poder marcar fallos intermedios.
        let extractResult;
        try {
            extractResult = await extractTextFromFile(filePath, filename);
        } catch (err) {
            await analyses.update(analysis.id, {
                status: 'failed',
                errorMessage: err.message,
            });

            req.log?.warn('Error extrayendo texto del CV', {
                userId: req.user.id,
                analysisId: analysis.id,
                error: err.message,
            });

            return res.status(422).json({
                success: false,
                message: err.message,
            });
        }

        const { text } = extractResult;

        if (!text || text.length < 50) {
            await analyses.update(analysis.id, {
                status: 'failed',
                errorMessage: 'No se pudo extraer suficiente contenido del archivo.',
            });

            req.log?.warn('CV rechazado por contenido insuficiente', {
                userId: req.user.id,
                analysisId: analysis.id,
                textLength: text?.length || 0,
            });

            return res.status(422).json({
                success: false,
                message: 'No se pudo leer el contenido del archivo. Asegurate de que no este vacio y sea un formato valido.',
            });
        }

        // Primero generamos el perfil estructurado y luego la recomendacion academica.
        let extractedProfile;
        try {
            extractedProfile = await extractProfileFromCV(text);
        } catch (aiErr) {
            await analyses.update(analysis.id, {
                status: 'failed',
                errorMessage: 'Error al extraer perfil con IA',
            });

            (req.log || logger).error('Error extrayendo perfil del CV', {
                userId: req.user.id,
                analysisId: analysis.id,
                error: aiErr.message,
            });

            return res.status(502).json({
                success: false,
                message: 'La IA no pudo procesar el contenido del archivo. Intenta con un archivo mas claro.',
            });
        }

        let recommendation;
        try {
            recommendation = await generateRecommendation(extractedProfile, analysis.sourceType, {
                masterId: selectedMasterId,
            });
        } catch (aiErr) {
            await analyses.update(analysis.id, {
                status: 'failed',
                errorMessage: 'Error al generar recomendacion',
            });

            (req.log || logger).error('Error generando recomendacion del CV', {
                userId: req.user.id,
                analysisId: analysis.id,
                error: aiErr.message,
            });

            return res.status(502).json({
                success: false,
                message: 'Hubo un error al generar tu recomendacion personalizada.',
            });
        }

        const updated = await analyses.update(analysis.id, {
            rawText: text.substring(0, 5000),
            extractedProfile,
            recommendation: {
                primarySpecialization: recommendation?.specialization?.name || recommendation?.primarySpecialization || 'General',
                primarySpecializationId: recommendation?.specialization?.id || recommendation?.primarySpecializationId || null,
                secondarySpecializations: recommendation?.secondarySpecializations || [],
                matchScore: recommendation?.matchScore || 0,
                reasoning: recommendation?.reasoning || 'No se pudo generar un razonamiento detallado.',
                subjects: recommendation?.subjects || [],
                sprintUrl: recommendation?.sprintUrl || '#',
                recommendedCourses: recommendation?.recommendedCourses || [],
            },
            status: 'completed',
            processedAt: new Date().toISOString(),
        });

        await users.update(req.user.id, {
            cvAnalysisId: analysis.id,
            selectedMasterId,
            recommendedSpecialization: recommendation?.specialization?.name || recommendation?.primarySpecialization,
        });

        req.log?.info('CV procesado', {
            userId: req.user.id,
            analysisId: updated.id,
            masterId: selectedMasterId,
            matchScore: updated.recommendation.matchScore,
            specializationId: updated.recommendation.primarySpecializationId,
        });

        res.status(200).json({
            success: true,
            message: 'Analisis completado exitosamente',
            data: {
                cvAnalysisId: updated.id,
                masterId: selectedMasterId,
                profile: extractedProfile,
                recommendation: updated.recommendation,
            },
        });
    } catch (error) {
        (req.log || logger).error('Error fatal en upload de CV', {
            userId: req.user?.id,
            error: error.message,
        });
        next(error);
    }
};

// Procesa un resumen de LinkedIn o indica al usuario que debe pegarlo manualmente.
const analyzeLinkedIn = async (req, res, next) => {
    try {
        const { linkedinUrl, linkedinSummary } = req.body;
        const selectedMasterId = req.body.masterId || req.user.selectedMasterId || null;

        if (!selectedMasterId || !isValidMasterId(selectedMasterId)) {
            return res.status(400).json({
                success: false,
                message: 'Debes seleccionar un master valido antes de analizar tu perfil.',
            });
        }

        if (!linkedinUrl) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporciona tu URL de LinkedIn.',
            });
        }

        if (linkedinSummary && linkedinSummary.length > 50) {
            const analysis = await analyses.create({
                userId: req.user.id,
                sourceType: 'linkedin',
                masterId: selectedMasterId,
                linkedinUrl,
                rawText: linkedinSummary,
            });

            await analyses.update(analysis.id, { status: 'processing' });
            const extractedProfile = await extractProfileFromCV(linkedinSummary);
            const recommendation = await generateRecommendation(extractedProfile, 'linkedin', {
                masterId: selectedMasterId,
            });

            const updated = await analyses.update(analysis.id, {
                extractedProfile,
                recommendation: {
                    primarySpecialization: recommendation.specialization?.name || recommendation.primarySpecialization,
                    primarySpecializationId: recommendation.specialization?.id || recommendation.primarySpecializationId,
                    secondarySpecializations: recommendation.secondarySpecializations || [],
                    matchScore: recommendation.matchScore,
                    reasoning: recommendation.reasoning,
                    subjects: recommendation.subjects || [],
                    sprintUrl: recommendation.sprintUrl,
                    recommendedCourses: recommendation.recommendedCourses || [],
                },
                status: 'completed',
                processedAt: new Date().toISOString(),
            });

            await users.update(req.user.id, {
                cvAnalysisId: analysis.id,
                linkedinUrl,
                selectedMasterId,
                recommendedSpecialization: recommendation.specialization?.name,
            });

            req.log?.info('LinkedIn procesado', {
                userId: req.user.id,
                analysisId: updated.id,
                masterId: selectedMasterId,
                specializationId: updated.recommendation.primarySpecializationId,
                matchScore: updated.recommendation.matchScore,
            });

            return res.status(200).json({
                success: true,
                message: 'Perfil de LinkedIn analizado exitosamente.',
                data: {
                    cvAnalysisId: updated.id,
                    masterId: selectedMasterId,
                    profile: extractedProfile,
                    recommendation: {
                        specialization: recommendation.specialization,
                        matchScore: recommendation.matchScore,
                        reasoning: recommendation.reasoning,
                        subjects: recommendation.subjects,
                        sprintUrl: recommendation.sprintUrl,
                        secondarySpecializations: recommendation.secondarySpecializations,
                        recommendedCourses: recommendation.recommendedCourses || [],
                    },
                },
            });
        }

        req.log?.info('LinkedIn requiere resumen manual', {
            userId: req.user.id,
            masterId: selectedMasterId,
            linkedinUrl,
        });

        return res.status(200).json({
            success: true,
            requiresManualInput: true,
            message:
                'Para analizar tu perfil de LinkedIn, por favor copia y pega el texto de tu perfil (seccion "Acerca de" y experiencia) en el siguiente mensaje del chat.',
            linkedinUrl,
        });
    } catch (error) {
        next(error);
    }
};

// Devuelve el ultimo analisis completado asociado al usuario autenticado.
const getMyAnalysis = async (req, res, next) => {
    try {
        const analysis = await analyses.findLatestCompleted(req.user.id);

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: 'No se encontro ningun analisis de CV. Por favor sube tu CV.',
            });
        }

        res.status(200).json({
            success: true,
            data: { analysis },
        });
    } catch (error) {
        next(error);
    }
};

// Lista el historial de analisis sin exponer el texto crudo almacenado.
const getAnalysisHistory = async (req, res, next) => {
    try {
        const userAnalyses = await analyses.findByUserId(req.user.id);
        const allAnalyses = userAnalyses.map((analysis) => {
            const { rawText, ...rest } = analysis;
            return rest;
        });

        res.status(200).json({
            success: true,
            data: { analyses: allAnalyses, total: allAnalyses.length },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { uploadCV, analyzeLinkedIn, getMyAnalysis, getAnalysisHistory };
