/**
 * User Controller
 * Delegates user flows to the users module.
 */

const { users } = require('../store');
const { sendSuccess } = require('../shared/http/respond');
const { serializeProfileResponse, serializeMasterSelection } = require('../modules/users/serializer');
const {
    getUserProfile,
    deactivateUserAccount,
    listMasters,
    selectUserMaster,
} = require('../modules/users/service');

const getProfile = async (req, res, next) => {
    try {
        const result = await getUserProfile({ userId: req.user.id });

        return sendSuccess(res, {
            data: serializeProfileResponse({
                usersRepository: users,
                ...result,
            }),
        });
    } catch (error) {
        next(error);
    }
};

const deactivateAccount = async (req, res, next) => {
    try {
        await deactivateUserAccount({ userId: req.user.id });

        return sendSuccess(res, {
            message: 'Tu cuenta ha sido desactivada exitosamente.',
        });
    } catch (error) {
        next(error);
    }
};

const getMasters = async (req, res, next) => {
    try {
        const masters = await listMasters();

        return sendSuccess(res, {
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
        const result = await selectUserMaster({
            userId: req.user.id,
            masterId: req.body.masterId,
        });

        return sendSuccess(res, {
            message: 'Master seleccionado exitosamente.',
            data: serializeMasterSelection({
                usersRepository: users,
                user: result.user,
                selectedMaster: result.master,
            }),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getProfile, deactivateAccount, getMasters, selectMaster };
