const { body } = require('express-validator');

const uploadCvValidation = [
    body('masterId')
        .optional()
        .isString().withMessage('masterId debe ser texto.'),
];

const linkedinValidation = [
    body('masterId')
        .optional()
        .isString().withMessage('masterId debe ser texto.'),
    body('linkedinUrl')
        .trim()
        .notEmpty().withMessage('Por favor proporciona tu URL de LinkedIn.'),
    body('linkedinSummary')
        .optional()
        .isString().withMessage('linkedinSummary debe ser texto.'),
];

module.exports = {
    uploadCvValidation,
    linkedinValidation,
};
