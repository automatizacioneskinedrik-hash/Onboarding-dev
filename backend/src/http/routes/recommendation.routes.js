/**
 * Recommendation Routes
 */

const express = require('express');

const {
    getAllSpecializationsHandler,
    getSpecializationByIdHandler,
    getMyRecommendation,
    regenerateRecommendation,
} = require('../controllers/recommendation.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../validate');
const { regenerateRecommendationValidation } = require('../validators/recommendations.validator');

const router = express.Router();

router.get('/specializations', getAllSpecializationsHandler);
router.get('/specializations/:id', getSpecializationByIdHandler);
router.get('/my-recommendation', protect, getMyRecommendation);
router.post('/regenerate', protect, regenerateRecommendationValidation, validate, regenerateRecommendation);

module.exports = router;
