import { describe, expect, it } from 'vitest';
import { buildCvSummary, normalizeAnalysis } from './analysis';

describe('analysis utils', () => {
    const masters = [{ id: 'mtecmba', code: 'Master Tech MBA' }];

    it('normalizes backend payload into frontend analysis shape', () => {
        const analysis = normalizeAnalysis(
            {
                id: 'analysis-1',
                masterId: 'mtecmba',
                profile: {
                    currentRole: 'Product Manager',
                },
                recommendation: {
                    primarySpecialization: 'Strategy',
                },
            },
            masters
        );

        expect(analysis.master.code).toBe('Master Tech MBA');
        expect(analysis.extractedProfile.currentRole).toBe('Product Manager');
        expect(analysis.recommendation.primarySpecialization).toBe('Strategy');
    });

    it('builds a readable cv summary with fallbacks', () => {
        expect(
            buildCvSummary({
                extractedProfile: {
                    currentRole: 'Data Analyst',
                    industry: 'Fintech',
                    yearsOfExperience: 4,
                    skills: ['SQL', 'Python', 'Power BI'],
                },
            })
        ).toEqual({
            role: 'Data Analyst',
            industry: 'Fintech',
            experience: '4 anos',
            topSkills: ['SQL', 'Python', 'Power BI'],
        });
    });
});
