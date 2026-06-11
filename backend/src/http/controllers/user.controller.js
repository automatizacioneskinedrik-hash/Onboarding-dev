/**
 * User Controller
 * Delegates user flows to the users module.
 */

const { getAppContainer } = require('../../composition-root');
const { sendSuccess } = require('../respond');
const { serializeProfileResponse, serializeMasterSelection } = require('../serializers/users.serializer');

const getUsersRepository = () => getAppContainer().repositories.userRepo;
const getUseCases = () => getAppContainer().useCases;

const getProfile = async (req, res, next) => {
    try {
        const result = await getUseCases().getUserProfile({ userId: req.user.id });

        return sendSuccess(res, {
            data: serializeProfileResponse({
                usersRepository: getUsersRepository(),
                ...result,
            }),
        });
    } catch (error) {
        next(error);
    }
};

const deactivateAccount = async (req, res, next) => {
    try {
        await getUseCases().deactivateUserAccount({ userId: req.user.id });

        return sendSuccess(res, {
            message: 'Tu cuenta ha sido desactivada exitosamente.',
        });
    } catch (error) {
        next(error);
    }
};

const getMasters = async (req, res, next) => {
    try {
        const masters = await getUseCases().listMasters();

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

const getMasterModules = async (req, res, next) => {
    try {
        const result = await getUseCases().listMasterModules({
            masterId: req.query.masterId || req.user.selectedMasterId,
        });

        return sendSuccess(res, {
            data: {
                master: result.master,
                modules: result.modules,
                total: result.modules.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

const selectMaster = async (req, res, next) => {
    try {
        const result = await getUseCases().selectUserMaster({
            userId: req.user.id,
            masterId: req.body.masterId,
        });

        return sendSuccess(res, {
            message: 'Master seleccionado exitosamente.',
            data: serializeMasterSelection({
                usersRepository: getUsersRepository(),
                user: result.user,
                selectedMaster: result.master,
            }),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getProfile, deactivateAccount, getMasters, getMasterModules, selectMaster };
