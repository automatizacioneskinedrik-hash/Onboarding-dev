const { serializeUser } = require('../../shared/serializers/user.serializer');

const serializeProfileResponse = ({ usersRepository, user, chatCount, analysisCount }) => ({
    user: serializeUser(usersRepository, user),
    stats: { chatCount, analysisCount },
});

const serializeMasterSelection = ({ usersRepository, user, selectedMaster }) => ({
    user: serializeUser(usersRepository, user),
    selectedMaster,
});

module.exports = {
    serializeProfileResponse,
    serializeMasterSelection,
};
