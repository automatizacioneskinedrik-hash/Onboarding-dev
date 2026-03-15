/**
 * User Model
 * Handles authentication and user profile
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'El nombre es requerido'],
            trim: true,
            maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
        },
        email: {
            type: String,
            required: [true, 'El email es requerido'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un email válido'],
        },
        password: {
            type: String,
            required: [true, 'La contraseña es requerida'],
            minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
            select: false, // Don't return password by default
        },
        avatar: {
            type: String,
            default: null,
        },
        // CV / Profile data
        cvAnalysis: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CVAnalysis',
            default: null,
        },
        linkedinUrl: {
            type: String,
            default: null,
        },
        selectedMasterId: {
            type: String,
            default: null,
        },
        // Recommended specialization
        recommendedSpecialization: {
            type: String,
            default: null,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Virtual: Chat count ──────────────────────────────────────────────────────
userSchema.virtual('chatCount', {
    ref: 'Chat',
    localField: '_id',
    foreignField: 'userId',
    count: true,
});

// ─── Pre-save: Hash password ──────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ─── Method: Compare password ─────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// ─── Method: Safe user object (no password) ───────────────────────────────────
userSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
