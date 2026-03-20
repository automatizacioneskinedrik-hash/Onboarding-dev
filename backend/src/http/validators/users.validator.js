const { body } = require('express-validator');

const selectMasterValidation = [
    body('masterId')
        .trim()
        .notEmpty().withMessage('Master no valido.'),
];

module.exports = {
    selectMasterValidation,
};
