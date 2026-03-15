/**
 * User Routes
 * GET    /api/users/profile    - Get user profile with stats
 * GET    /api/users/masters    - Get available masters
 * PUT    /api/users/master     - Select master
 * DELETE /api/users/account    - Deactivate account
 */

const express = require('express');
const router = express.Router();

const { getProfile, deactivateAccount, getMasters, selectMaster } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/profile', getProfile);
router.get('/masters', getMasters);
router.put('/master', selectMaster);
router.delete('/account', deactivateAccount);

module.exports = router;
