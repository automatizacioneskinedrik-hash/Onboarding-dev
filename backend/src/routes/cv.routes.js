/**
 * CV Routes
 */

const express = require('express');

const { uploadCV, analyzeLinkedIn, getMyAnalysis, getAnalysisHistory } = require('../controllers/cv.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload, handleUploadError } = require('../middleware/upload.middleware');
const { validate } = require('../shared/http/validate');
const { uploadCvValidation, linkedinValidation } = require('../modules/cv/validator');

const router = express.Router();

router.use(protect);

router.post(
    '/upload',
    uploadCvValidation,
    validate,
    upload.single('cv'),
    handleUploadError,
    uploadCV
);

router.post('/linkedin', linkedinValidation, validate, analyzeLinkedIn);
router.get('/my-analysis', getMyAnalysis);
router.get('/history', getAnalysisHistory);

module.exports = router;
