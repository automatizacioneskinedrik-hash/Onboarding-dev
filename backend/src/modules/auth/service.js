const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const { AppError } = require('../../shared/errors/app-error');
const { generateToken } = require('../../middleware/auth.middleware');
const { users } = require('../../store');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const registerUser = async ({ name, email, password }) => {
    try {
        const user = await users.create({ name, email, password });
        return {
            user,
            token: generateToken(user.id),
        };
    } catch (error) {
        if (error.message === 'DUPLICATE_EMAIL') {
            throw new AppError('Ya existe una cuenta con ese email. Por favor inicia sesion.', 409);
        }

        throw error;
    }
};

const loginUser = async ({ email, password }) => {
    const user = await users.findByEmail(email);

    if (!user || !users.verifyPassword(user, password)) {
        throw new AppError('Credenciales invalidas. Por favor verifica tu email y contrasena.', 401);
    }

    await users.update(user.id, { lastLogin: new Date().toISOString() });
    const updatedUser = await users.findById(user.id);

    return {
        user: updatedUser,
        token: generateToken(user.id),
    };
};

const loginWithGoogle = async ({ credential }) => {
    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    let user = await users.findByEmail(email);

    if (!user) {
        user = await users.create({
            name,
            email,
            avatar: picture,
            googleId,
            isGoogleAccount: true,
            password: null,
        });
    } else {
        await users.update(user.id, {
            lastLogin: new Date().toISOString(),
            avatar: picture || user.avatar,
            googleId: googleId || user.googleId,
        });

        user = await users.findById(user.id);
    }

    return {
        user,
        token: generateToken(user.id),
    };
};

const getCurrentUser = async ({ userId }) => {
    return users.findById(userId);
};

const updateUserProfile = async ({ userId, name }) => {
    return users.update(userId, { name: name.trim() });
};

const changeUserPassword = async ({ userId, currentPassword, newPassword }) => {
    const user = await users.findById(userId);

    if (!users.verifyPassword(user, currentPassword)) {
        throw new AppError('La contrasena actual es incorrecta.', 401);
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
    const hashedPassword = `${salt}:${hash}`;

    await users.update(userId, { password: hashedPassword });

    return {
        token: generateToken(userId),
    };
};

module.exports = {
    registerUser,
    loginUser,
    loginWithGoogle,
    getCurrentUser,
    updateUserProfile,
    changeUserPassword,
};
