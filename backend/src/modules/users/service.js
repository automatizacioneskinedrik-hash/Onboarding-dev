const { AppError } = require('../../shared/errors/app-error');
const { users, stats } = require('../../store');
const { getAllMasters, getMasterById } = require('../../utils/masters');

const getUserProfile = async ({ userId }) => {
    const user = await users.findById(userId);
    const chatCount = await stats.chatCountByUser(userId);
    const analysisCount = await stats.analysisCountByUser(userId);

    return { user, chatCount, analysisCount };
};

const deactivateUserAccount = async ({ userId }) => users.update(userId, { isActive: false });

const listMasters = async () => getAllMasters();

const selectUserMaster = async ({ userId, masterId }) => {
    const master = getMasterById(masterId);

    if (!master) {
        throw new AppError('Master no valido.', 400);
    }

    const user = await users.update(userId, { selectedMasterId: master.id });
    return { user, master };
};

module.exports = {
    getUserProfile,
    deactivateUserAccount,
    listMasters,
    selectUserMaster,
};
