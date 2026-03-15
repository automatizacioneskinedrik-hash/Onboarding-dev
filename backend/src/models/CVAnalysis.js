/**
 * CVAnalysis Model
 * Stores parsed CV data and AI analysis results
 */

const mongoose = require('mongoose');

const cvAnalysisSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // Source type
        sourceType: {
            type: String,
            enum: ['pdf', 'linkedin'],
            required: true,
        },
        masterId: {
            type: String,
            default: null,
        },
        // File info (for PDF uploads)
        file: {
            filename: String,
            originalName: String,
            mimetype: String,
            size: Number,
            path: String,
        },
        // LinkedIn URL (for LinkedIn analysis)
        linkedinUrl: {
            type: String,
            default: null,
        },
        // Raw extracted text from PDF
        rawText: {
            type: String,
            default: null,
        },
        // AI-extracted profile data
        extractedProfile: {
            name: String,
            currentRole: String,
            yearsOfExperience: Number,
            industry: String,
            skills: [String],
            education: [
                {
                    degree: String,
                    field: String,
                    institution: String,
                    year: Number,
                },
            ],
            experience: [
                {
                    title: String,
                    company: String,
                    duration: String,
                    description: String,
                },
            ],
            languages: [String],
            certifications: [String],
            summary: String,
        },
        // AI recommendation
        recommendation: {
            primarySpecialization: {
                type: String,
                required: true,
            },
            secondarySpecializations: [String],
            matchScore: {
                type: Number,
                min: 0,
                max: 100,
            },
            reasoning: String,
            subjects: [String],
            springUrl: String,
        },
        // Processing status
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending',
        },
        errorMessage: {
            type: String,
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// ─── Index ────────────────────────────────────────────────────────────────────
cvAnalysisSchema.index({ userId: 1, createdAt: -1 });
cvAnalysisSchema.index({ status: 1 });

module.exports = mongoose.model('CVAnalysis', cvAnalysisSchema);
