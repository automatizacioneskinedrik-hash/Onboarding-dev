/**
 * Recommendation Controller
 * Uses Firestore (via Store Index).
 */

const { analyses } = require('../store');
const { getAllSpecializations, getSpecializationById } = require('../utils/specializations');
const { generateRecommendation } = require('../services/openai.service');

/**
 * GET /api/recommendations/specializations
 */
const getAllSpecializationsHandler = async (req, res, next) => {
    try {
        const specializations = getAllSpecializations();
        res.status(200).json({
            success: true,
            data: { specializations, total: specializations.length },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/recommendations/specializations/:id
 */
const getSpecializationByIdHandler = async (req, res, next) => {
    try {
        const specialization = getSpecializationById(req.params.id);

        if (!specialization) {
            return res.status(404).json({
                success: false,
                message: 'Especialización no encontrada.',
            });
        }

        res.status(200).json({
            success: true,
            data: { specialization },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/recommendations/my-recommendation
 */
const getMyRecommendation = async (req, res, next) => {
    try {
        const analysis = await analyses.findLatestCompleted(req.user.id);

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: 'No tienes una recomendación aún. Por favor sube tu CV o perfil de LinkedIn.',
            });
        }

        // Match specialization from catalog
        const allSpecs = getAllSpecializations();
        const specialization =
            allSpecs.find((s) => s.name === analysis.recommendation?.primarySpecialization) ||
            allSpecs[0];

        res.status(200).json({
            success: true,
            data: {
                recommendation: {
                    specialization,
                    matchScore: analysis.recommendation?.matchScore,
                    reasoning: analysis.recommendation?.reasoning,
                    subjects: analysis.recommendation?.subjects || specialization.subjects,
                    springUrl: analysis.recommendation?.springUrl || specialization.springUrl,
                    secondarySpecializations: analysis.recommendation?.secondarySpecializations || [],
                    recommendedCourses: analysis.recommendation?.recommendedCourses || [],
                },
                profile: analysis.extractedProfile,
                masterId: analysis.masterId || null,
                analysisDate: analysis.processedAt,
                sourceType: analysis.sourceType,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/recommendations/regenerate
 */
const regenerateRecommendation = async (req, res, next) => {
    try {
        const { cvAnalysisId } = req.body;

        const analysis = await analyses.findById(cvAnalysisId);

        if (!analysis || analysis.userId !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Análisis de CV no encontrado.',
            });
        }

        if (!analysis.extractedProfile) {
            return res.status(400).json({
                success: false,
                message: 'No hay datos de perfil para regenerar la recomendación.',
            });
        }

        const recommendation = await generateRecommendation(
            analysis.extractedProfile,
            analysis.sourceType,
            { masterId: analysis.masterId || req.user.selectedMasterId || null }
        );

        await analyses.update(cvAnalysisId, {
            recommendation: {
                primarySpecialization: recommendation.specialization?.name || recommendation.primarySpecialization,
                secondarySpecializations: recommendation.secondarySpecializations || [],
                matchScore: recommendation.matchScore,
                reasoning: recommendation.reasoning,
                subjects: recommendation.subjects || [],
                springUrl: recommendation.springUrl,
                recommendedCourses: recommendation.recommendedCourses || [],
            },
        });

        res.status(200).json({
            success: true,
            message: 'Recomendación regenerada exitosamente.',
            data: {
                recommendation: {
                    specialization: recommendation.specialization,
                    matchScore: recommendation.matchScore,
                    reasoning: recommendation.reasoning,
                    subjects: recommendation.subjects,
                    springUrl: recommendation.springUrl,
                    secondarySpecializations: recommendation.secondarySpecializations,
                    recommendedCourses: recommendation.recommendedCourses || [],
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllSpecializationsHandler,
    getSpecializationByIdHandler,
    getMyRecommendation,
    regenerateRecommendation,
};
