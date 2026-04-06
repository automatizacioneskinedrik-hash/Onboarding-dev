const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveUniversityRecommendation } = require('../src/ai/university-route-planner');

test('university route planner builds a 6-block route with unique specializations', () => {
    const recommendation = resolveUniversityRecommendation({
        masterId: 'mtecmba',
        profile: {
            currentRole: 'Product Manager',
            industry: 'Tecnologia',
            skills: ['Analitica', 'Liderazgo', 'Customer Experience'],
            summary: 'Profesional digital orientada a producto, datos y escalamiento de equipos.',
        },
    });

    assert.equal(recommendation.planBlocks.length, 6);
    assert.equal(new Set(recommendation.planBlocks.map((block) => block.specializationId)).size, 6);
    assert.equal(recommendation.subjects.length, 6);
});

test('university route planner respects MBA-specific catalog differences', () => {
    const recommendation = resolveUniversityRecommendation({
        masterId: 'mintear',
        profile: {
            currentRole: 'Automation Lead',
            industry: 'Tecnologia',
            skills: ['IA', 'Automatizacion', 'Prompts'],
            summary: 'Perfil con foco en automatizacion, agentes e inteligencia artificial aplicada.',
        },
        aiRecommendation: {
            planBlocks: [
                {
                    specializationId: 'ia-automatizacion',
                    blockTitle: 'RPA (Robotic Process Automation) e Hiperautomatizacion',
                },
            ],
        },
    });

    assert.equal(recommendation.planBlocks[0].specializationId, 'ia-automatizacion');
    assert.match(recommendation.planBlocks[0].blockTitle, /RPA/);
});
