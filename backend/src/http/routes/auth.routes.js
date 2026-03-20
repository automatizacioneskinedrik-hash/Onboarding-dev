/**
 * Auth Routes
 */

const express = require('express');

const {
    register,
    login,
    googleLogin,
    getMe,
    updateProfile,
    changePassword,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../validate');
const {
    registerValidation,
    loginValidation,
    googleLoginValidation,
    updateProfileValidation,
    changePasswordValidation,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/google', googleLoginValidation, validate, googleLogin);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfileValidation, validate, updateProfile);
router.put('/change-password', protect, changePasswordValidation, validate, changePassword);

module.exports = router;
