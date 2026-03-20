const { body } = require('express-validator');

const registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('Por favor ingresa un email valido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contrasena es requerida')
        .isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .custom((value) => value.includes('@')).withMessage('El email debe contener @')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contrasena es requerida')
        .isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
];

const googleLoginValidation = [
    body('credential')
        .notEmpty().withMessage('No se proporcionaron credenciales de Google.'),
];

const updateProfileValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('El nombre es requerido')
        .isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
];

const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('La contrasena actual es requerida'),
    body('newPassword')
        .notEmpty().withMessage('La nueva contrasena es requerida')
        .isLength({ min: 6 }).withMessage('La nueva contrasena debe tener al menos 6 caracteres'),
];

module.exports = {
    registerValidation,
    loginValidation,
    googleLoginValidation,
    updateProfileValidation,
    changePasswordValidation,
};
