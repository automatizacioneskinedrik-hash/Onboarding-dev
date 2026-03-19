const { serializeUser } = require('../../shared/serializers/user.serializer');

const serializeAuthPayload = ({ usersRepository, user, token }) => ({
    token,
    user: serializeUser(usersRepository, user),
});

module.exports = {
    serializeAuthPayload,
};
