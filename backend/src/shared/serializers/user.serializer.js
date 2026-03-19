const serializeUser = (usersRepository, user) => usersRepository.safe(user);

module.exports = {
    serializeUser,
};
