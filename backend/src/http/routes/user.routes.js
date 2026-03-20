/**
 * User Routes
 */

const express = require('express');

const { getProfile, deactivateAccount, getMasters, getMasterModules, selectMaster } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../validate');
const { selectMasterValidation } = require('../validators/users.validator');

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.get('/masters', getMasters);
router.get('/master-modules', getMasterModules);
router.put('/master', selectMasterValidation, validate, selectMaster);
router.delete('/account', deactivateAccount);

module.exports = router;
