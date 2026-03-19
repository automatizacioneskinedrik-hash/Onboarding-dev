/**
 * User Routes
 */

const express = require('express');

const { getProfile, deactivateAccount, getMasters, selectMaster } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../shared/http/validate');
const { selectMasterValidation } = require('../modules/users/validator');

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.get('/masters', getMasters);
router.put('/master', selectMasterValidation, validate, selectMaster);
router.delete('/account', deactivateAccount);

module.exports = router;
