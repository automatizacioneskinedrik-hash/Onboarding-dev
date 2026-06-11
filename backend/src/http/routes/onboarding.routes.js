/**
 * Onboarding Routes
 */

const express = require('express');

const {
    getOnboardingVideo,
    updateOnboardingVideo,
} = require('../controllers/onboarding.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/video', protect, getOnboardingVideo);
router.put('/video', protect, restrictTo('admin'), updateOnboardingVideo);

module.exports = router;
