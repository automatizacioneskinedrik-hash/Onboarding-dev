/**
 * Auth Controller
 * Uses Firestore (via Store Index).
 */

const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const { createLogger } = require('../logging/logger');
const { generateToken } = require('../middleware/auth.middleware');
const { users } = require('../store');

const logger = createLogger({ component: 'controller.auth' });
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Reduce el email a su dominio para logs sin exponer PII completa.
const getEmailDomain = (email = '') => String(email).split('@')[1] || null;

// Crea una cuenta local y devuelve el token inicial del usuario.
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporciona nombre, email y contrasena.',
            });
        }

        let user;
        try {
            user = await users.create({ name, email, password });
        } catch (err) {
            if (err.message === 'DUPLICATE_EMAIL') {
                req.log?.warn('Registro rechazado por email duplicado', {
                    emailDomain: getEmailDomain(email),
                });

                return res.status(409).json({
                    success: false,
                    message: 'Ya existe una cuenta con ese email. Por favor inicia sesion.',
                });
            }
            throw err;
        }

        const token = generateToken(user.id);

        req.log?.info('Usuario registrado', {
            userId: user.id,
            emailDomain: getEmailDomain(email),
        });

        res.status(201).json({
            success: true,
            message: 'Cuenta creada exitosamente. Bienvenido a LAR University.',
            data: {
                token,
                user: users.safe(user),
            },
        });
    } catch (error) {
        next(error);
    }
};

// Valida credenciales locales y renueva la fecha de ultimo acceso.
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporciona email y contrasena.',
            });
        }

        const user = await users.findByEmail(email);

        if (!user || !users.verifyPassword(user, password)) {
            req.log?.warn('Login fallido por credenciales invalidas', {
                emailDomain: getEmailDomain(email),
            });

            return res.status(401).json({
                success: false,
                message: 'Credenciales invalidas. Por favor verifica tu email y contrasena.',
            });
        }

        await users.update(user.id, { lastLogin: new Date().toISOString() });
        const updatedUser = await users.findById(user.id);
        const token = generateToken(user.id);

        req.log?.info('Login exitoso', {
            userId: user.id,
            emailDomain: getEmailDomain(email),
        });

        res.status(200).json({
            success: true,
            message: `Bienvenido de nuevo, ${updatedUser.name}!`,
            data: {
                token,
                user: users.safe(updatedUser),
            },
        });
    } catch (error) {
        next(error);
    }
};

// Valida el token de Google y crea o sincroniza el usuario local.
const googleLogin = async (req, res, next) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionaron credenciales de Google.',
            });
        }

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

        const token = generateToken(user.id);

        req.log?.info('Login con Google exitoso', {
            userId: user.id,
            emailDomain: getEmailDomain(email),
        });

        res.status(200).json({
            success: true,
            message: `Bienvenido, ${user.name}!`,
            data: {
                token,
                user: users.safe(user),
            },
        });
    } catch (error) {
        (req.log || logger).error('Error en login con Google', {
            error: error.message,
            errorName: error.name,
        });

        res.status(401).json({
            success: false,
            message: 'Error de autenticacion con Google.',
            requestId: req.requestId,
        });
    }
};

// Devuelve el perfil autenticado usando la version segura del usuario.
const getMe = async (req, res, next) => {
    try {
        const user = await users.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: { user: users.safe(user) },
        });
    } catch (error) {
        next(error);
    }
};

// Permite actualizar los datos basicos editables del perfil.
const updateProfile = async (req, res, next) => {
    try {
        const { name } = req.body;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'El nombre debe tener al menos 2 caracteres.',
            });
        }

        const updated = await users.update(req.user.id, { name: name.trim() });

        req.log?.info('Perfil actualizado', {
            userId: req.user.id,
        });

        res.status(200).json({
            success: true,
            message: 'Perfil actualizado exitosamente.',
            data: { user: users.safe(updated) },
        });
    } catch (error) {
        next(error);
    }
};

// Reemplaza la contrasena actual despues de validar la credencial previa.
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await users.findById(req.user.id);

        if (!users.verifyPassword(user, currentPassword)) {
            req.log?.warn('Cambio de contrasena rechazado', {
                userId: req.user.id,
                reason: 'current_password_invalid',
            });

            return res.status(401).json({
                success: false,
                message: 'La contrasena actual es incorrecta.',
            });
        }

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contrasena debe tener al menos 6 caracteres.',
            });
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
        const hashedPassword = `${salt}:${hash}`;

        await users.update(req.user.id, { password: hashedPassword });
        const token = generateToken(req.user.id);

        req.log?.info('Contrasena actualizada', {
            userId: req.user.id,
        });

        res.status(200).json({
            success: true,
            message: 'Contrasena actualizada exitosamente.',
            data: { token },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, getMe, updateProfile, changePassword, googleLogin };
