const crypto = require('crypto');

const { AppError } = require('../services/errors/app-error');
const { buildUserJourneyUpdate } = require('../services/users/user-journey.service');

const createAuthUseCases = ({ userRepo, tokenService, googleIdentityClient }) => {
    const registerUser = async ({ name, email, password }) => {
        try {
            const user = await userRepo.create({ name, email, password });
            return {
                user,
                token: tokenService.generateToken(user.id),
            };
        } catch (error) {
            if (error.message === 'DUPLICATE_EMAIL') {
                throw new AppError('Ya existe una cuenta con ese email. Por favor inicia sesion.', 409);
            }

            throw error;
        }
    };

    const loginUser = async ({ email, password }) => {
        const user = await userRepo.findByEmail(email);

        if (!user || !userRepo.verifyPassword(user, password)) {
            throw new AppError('Credenciales invalidas. Por favor verifica tu email y contrasena.', 401);
        }

        const now = new Date().toISOString();

        await userRepo.update(
            user.id,
            buildUserJourneyUpdate({
                user,
                userFields: { lastLogin: now },
                journeyFields: { lastActivityAt: now },
            })
        );
        const updatedUser = await userRepo.findById(user.id);

        return {
            user: updatedUser,
            token: tokenService.generateToken(user.id),
        };
    };

    const loginWithGoogle = async ({ credential }) => {
        const payload = await googleIdentityClient.verifyIdToken({ credential });
        const { email, name, picture, googleId } = payload;

        let user = await userRepo.findByEmail(email);

        if (!user) {
            user = await userRepo.create({
                name,
                email,
                avatar: picture,
                googleId,
                isGoogleAccount: true,
                password: null,
            });
        } else {
            const now = new Date().toISOString();

            await userRepo.update(
                user.id,
                buildUserJourneyUpdate({
                    user,
                    userFields: {
                        lastLogin: now,
                        avatar: picture || user.avatar,
                        googleId: googleId || user.googleId,
                    },
                    journeyFields: { lastActivityAt: now },
                })
            );

            user = await userRepo.findById(user.id);
        }

        return {
            user,
            token: tokenService.generateToken(user.id),
        };
    };

    const getCurrentUser = async ({ userId }) => userRepo.findById(userId);

    const updateUserProfile = async ({ userId, name }) => userRepo.update(userId, { name: name.trim() });

    const changeUserPassword = async ({ userId, currentPassword, newPassword }) => {
        const user = await userRepo.findById(userId);

        if (!userRepo.verifyPassword(user, currentPassword)) {
            throw new AppError('La contrasena actual es incorrecta.', 401);
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
        const hashedPassword = `${salt}:${hash}`;

        await userRepo.update(userId, { password: hashedPassword });

        return {
            token: tokenService.generateToken(userId),
        };
    };

    return {
        registerUser,
        loginUser,
        loginWithGoogle,
        getCurrentUser,
        updateUserProfile,
        changeUserPassword,
    };
};

module.exports = {
    createAuthUseCases,
};
