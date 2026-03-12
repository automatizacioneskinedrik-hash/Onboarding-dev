/**
 * Chat Model
 * Stores conversation history per user (like ChatGPT)
 */

const mongoose = require('mongoose');

// Individual message schema
const messageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ['user', 'assistant', 'system'],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        // Metadata for special messages
        metadata: {
            type: {
                type: String,
                enum: ['text', 'cv_upload', 'linkedin_analysis', 'recommendation', 'follow_up'],
                default: 'text',
            },
            recommendation: {
                specialization: String,
                springUrl: String,
                subjects: [String],
                matchScore: Number,
                reasoning: String,
            },
            cvFile: {
                filename: String,
                originalName: String,
                size: Number,
            },
            embedding: {
                status: {
                    type: String,
                    enum: ['generated', 'unavailable'],
                    default: 'unavailable',
                },
                model: String,
                dimensions: Number,
            },
            retrieval: {
                status: String,
                matches: [
                    {
                        id: String,
                        title: String,
                        contentType: String,
                        moduleTitle: String,
                        distance: Number,
                    },
                ],
            },
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

// Chat session schema
const chatSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            default: 'Nueva conversación',
            maxlength: [200, 'El título no puede exceder 200 caracteres'],
        },
        messages: [messageSchema],
        // CV or LinkedIn used in this chat
        cvAnalysisId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CVAnalysis',
            default: null,
        },
        linkedinUrl: {
            type: String,
            default: null,
        },
        // Final recommendation made in this chat
        finalRecommendation: {
            specialization: {
                type: String,
                default: null,
            },
            springUrl: {
                type: String,
                default: null,
            },
            subjects: [String],
            matchScore: {
                type: Number,
                min: 0,
                max: 100,
                default: null,
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        // Auto-generate title from first user message
        titleGenerated: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Virtual: Message count ───────────────────────────────────────────────────
chatSchema.virtual('messageCount').get(function () {
    return this.messages ? this.messages.length : 0;
});

// ─── Index for faster queries ─────────────────────────────────────────────────
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Chat', chatSchema);
