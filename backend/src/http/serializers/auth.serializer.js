const serializeAuthPayload = ({ usersRepository, user, token }) => ({
    token,
    user: usersRepository.safe(user),
});

module.exports = {
    serializeAuthPayload,
};
