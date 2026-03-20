/**
 * Auth Controller
 * Delegates auth flows to the auth module.
 */

const { createLogger } = require('../../services/observability/logger');
const { getAppContainer } = require('../../composition-root');
const { sendSuccess } = require('../respond');
const { serializeAuthPayload } = require('../serializers/auth.serializer');

const logger = createLogger({ component: 'controller.auth' });
const getUsersRepository = () => getAppContainer().repositories.userRepo;
const getUseCases = () => getAppContainer().useCases;

const getEmailDomain = (email = '') => String(email).split('@')[1] || null;

const register = async (req, res, next) => {
    try {
        const result = await getUseCases().registerUser(req.body);

        req.log?.info('Usuario registrado', {
            userId: result.user.id,
            emailDomain: getEmailDomain(result.user.email),
        });

        return sendSuccess(res, {
            statusCode: 201,
            message: 'Cuenta creada exitosamente. Bienvenido a LAR University.',
            data: serializeAuthPayload({
                usersRepository: getUsersRepository(),
                ...result,
            }),
        });
    } catch (error) {
        if (error.statusCode === 409) {
            req.log?.warn('Registro rechazado por email duplicado', {
                emailDomain: getEmailDomain(req.body.email),
            });
        }

        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const result = await getUseCases().loginUser(req.body);

        req.log?.info('Login exitoso', {
            userId: result.user.id,
            emailDomain: getEmailDomain(result.user.email),
        });

        return sendSuccess(res, {
            message: `Bienvenido de nuevo, ${result.user.name}!`,
            data: serializeAuthPayload({
                usersRepository: getUsersRepository(),
                ...result,
            }),
        });
    } catch (error) {
        if (error.statusCode === 401) {
            req.log?.warn('Login fallido por credenciales invalidas', {
                emailDomain: getEmailDomain(req.body.email),
            });
        }

        next(error);
    }
};

const googleLogin = async (req, res, next) => {
    try {
        const result = await getUseCases().loginWithGoogle(req.body);

        req.log?.info('Login con Google exitoso', {
            userId: result.user.id,
            emailDomain: getEmailDomain(result.user.email),
        });

        return sendSuccess(res, {
            message: `Bienvenido, ${result.user.name}!`,
            data: serializeAuthPayload({
                usersRepository: getUsersRepository(),
                ...result,
            }),
        });
    } catch (error) {
        (req.log || logger).error('Error en login con Google', {
            error: error.message,
            errorName: error.name,
        });
        next(error.statusCode ? error : Object.assign(error, { statusCode: 401, message: 'Error de autenticacion con Google.' }));
    }
};

const getMe = async (req, res, next) => {
    try {
        const user = await getUseCases().getCurrentUser({ userId: req.user.id });

        return sendSuccess(res, {
            data: { user: getUsersRepository().safe(user) },
        });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const user = await getUseCases().updateUserProfile({
            userId: req.user.id,
            name: req.body.name,
        });

        req.log?.info('Perfil actualizado', {
            userId: req.user.id,
        });

        return sendSuccess(res, {
            message: 'Perfil actualizado exitosamente.',
            data: { user: getUsersRepository().safe(user) },
        });
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const result = await getUseCases().changeUserPassword({
            userId: req.user.id,
            currentPassword: req.body.currentPassword,
            newPassword: req.body.newPassword,
        });

        req.log?.info('Contrasena actualizada', {
            userId: req.user.id,
        });

        return sendSuccess(res, {
            message: 'Contrasena actualizada exitosamente.',
            data: result,
        });
    } catch (error) {
        if (error.statusCode === 401) {
            req.log?.warn('Cambio de contrasena rechazado', {
                userId: req.user.id,
                reason: 'current_password_invalid',
            });
        }

        next(error);
    }
};

module.exports = { register, login, googleLogin, getMe, updateProfile, changePassword };
