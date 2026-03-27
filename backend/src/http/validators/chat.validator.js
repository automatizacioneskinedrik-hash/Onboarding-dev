const { body, param } = require('express-validator');

const chatIdValidation = [
    param('chatId')
        .trim()
        .notEmpty().withMessage('Chat no encontrado.'),
];

const createChatValidation = [
    body('title')
        .optional()
        .isString().withMessage('El titulo debe ser texto.'),
    body('cvAnalysisId')
        .optional({ nullable: true })
        .isString().withMessage('cvAnalysisId debe ser texto.'),
    body('masterId')
        .optional({ nullable: true })
        .isString().withMessage('masterId debe ser texto.'),
];

const sendMessageValidation = [
    ...chatIdValidation,
    body('content')
        .trim()
        .notEmpty().withMessage('El mensaje no puede estar vacio.'),
    body('cvAnalysisId')
        .optional({ nullable: true })
        .isString().withMessage('cvAnalysisId debe ser texto.'),
];

const updateChatTitleValidation = [
    ...chatIdValidation,
    body('title')
        .trim()
        .notEmpty().withMessage('El titulo no puede estar vacio.'),
];

module.exports = {
    chatIdValidation,
    createChatValidation,
    sendMessageValidation,
    updateChatTitleValidation,
};
