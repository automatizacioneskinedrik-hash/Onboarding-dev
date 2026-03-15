/**
 * User Controller
 * Uses Firestore (via Store Index).
 */

const { users, stats } = require('../store');
const { getAllMasters, getMasterById } = require('../utils/masters');

/**
 * GET /api/users/profile
 */
const getProfile = async (req, res, next) => {
    try {
        const user = await users.findById(req.user.id);

        const chatCount = await stats.chatCountByUser(req.user.id);
        const analysisCount = await stats.analysisCountByUser(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                user: users.safe(user),
                stats: { chatCount, analysisCount },
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/users/account
 */
const deactivateAccount = async (req, res, next) => {
    try {
        await users.update(req.user.id, { isActive: false });

        res.status(200).json({
            success: true,
            message: 'Tu cuenta ha sido desactivada exitosamente.',
        });
    } catch (error) {
        next(error);
    }
};

const getMasters = async (req, res, next) => {
    try {
        const masters = getAllMasters();
        res.status(200).json({
            success: true,
            data: {
                masters,
                total: masters.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

const selectMaster = async (req, res, next) => {
    try {
        const { masterId } = req.body;
        const master = getMasterById(masterId);

        if (!master) {
            return res.status(400).json({
                success: false,
                message: 'Master no valido.',
            });
        }

        const user = await users.update(req.user.id, {
            selectedMasterId: master.id,
        });

        res.status(200).json({
            success: true,
            message: 'Master seleccionado exitosamente.',
            data: {
                user: users.safe(user),
                selectedMaster: master,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getProfile, deactivateAccount, getMasters, selectMaster };
