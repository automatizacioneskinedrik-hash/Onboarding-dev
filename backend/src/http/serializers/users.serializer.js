const serializeProfileResponse = ({ usersRepository, user, chatCount, analysisCount }) => ({
    user: usersRepository.safe(user),
    stats: { chatCount, analysisCount },
});

const serializeMasterSelection = ({ usersRepository, user, selectedMaster }) => ({
    user: usersRepository.safe(user),
    selectedMaster,
});

module.exports = {
    serializeProfileResponse,
    serializeMasterSelection,
};
