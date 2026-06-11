const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveUniversityRecommendation } = require('../src/ai/university-route-planner');

test('university route planner builds a 6-block route from one specialization', () => {
    const recommendation = resolveUniversityRecommendation({
        masterId: 'mtecmba',
        profile: {
            currentRole: 'Product Manager',
            industry: 'Tecnologia',
            skills: ['Analitica', 'Liderazgo', 'Customer Experience'],
            summary: 'Profesional digital orientada a producto, datos y escalamiento de equipos.',
        },
        aiRecommendation: {
            primarySpecializationId: 'analitica-datos',
            planBlocks: [
                {
                    specializationId: 'tecnologia',
                    blockTitle: 'Estrategia de Ciberseguridad',
                },
            ],
        },
    });

    assert.equal(recommendation.planBlocks.length, 6);
    assert.equal(recommendation.primarySpecializationId, 'analitica-datos');
    assert.ok(recommendation.planBlocks.every((block) => block.specializationId === 'analitica-datos'));
    assert.deepEqual(recommendation.subjects, [
        'Analítica de datos para directivos',
        'Machine learning para la toma de decisiones empresariales',
        'Visualización de datos y cuadros de mando ejecutivos',
        'Analítica predictiva aplicada al negocio',
        'Gobierno del dato y calidad de la información',
        'Data-Driven management y cultura analítica',
    ]);
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
            primarySpecializationId: 'ia-automatizacion',
            planBlocks: [
                {
                    specializationId: 'comunicacion',
                    blockTitle: 'Comunicación para el Liderazgo',
                },
            ],
        },
    });

    assert.equal(recommendation.primarySpecializationId, 'ia-automatizacion');
    assert.equal(recommendation.planBlocks.length, 6);
    assert.ok(recommendation.planBlocks.every((block) => block.specializationId === 'ia-automatizacion'));
    assert.equal(recommendation.planBlocks[0].blockTitle, 'IA y Deep Learning para Negocios');
});
