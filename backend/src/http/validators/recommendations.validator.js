const { body } = require('express-validator');

const regenerateRecommendationValidation = [
    body('cvAnalysisId')
        .trim()
        .notEmpty().withMessage('cvAnalysisId es requerido.'),
];

module.exports = {
    regenerateRecommendationValidation,
};
