const test = require('node:test');
const assert = require('node:assert/strict');

const { createTestApp, loginDefaultUser } = require('./helpers/test-context');

test('POST /api/cv/upload returns completed analysis contract', async () => {
    const { request, store } = createTestApp();
    const token = await loginDefaultUser(request);

    const response = await request
        .post('/api/cv/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('masterId', 'mtecmba')
        .attach('cv', Buffer.from('%PDF-1.4 test file'), {
            filename: 'cv.pdf',
            contentType: 'application/pdf',
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.cvAnalysisId);
    assert.equal(response.body.data.masterId, 'mtecmba');
    assert.equal(response.body.data.recommendation.primarySpecializationId, 'tecnologia');
    assert.equal(response.body.data.recommendation.sprint.courses.length, 6);
    assert.equal(response.body.data.recommendation.sprint.blocks.length, 6);
    assert.equal(response.body.data.recommendation.sprintUrl, 'https://lar.dev/sprints/tecnologia');

    const user = [...store.users._db.values()].find((item) => item.email === 'user123@gmail.com');
    assert.equal(user.cvAnalysisId, response.body.data.cvAnalysisId);
    assert.equal(user.journeyContext.latestCompletedAnalysisId, response.body.data.cvAnalysisId);
    assert.equal(user.journeyContext.analysisCount, 1);
    assert.equal(user.journeyContext.onboardingStage, 'review_recommendation');
});

test('POST /api/cv/linkedin returns analysis contract', async () => {
    const { request, store } = createTestApp();
    const token = await loginDefaultUser(request);

    const response = await request
        .post('/api/cv/linkedin')
        .set('Authorization', `Bearer ${token}`)
        .send({
            masterId: 'mtecmba',
            linkedinUrl: 'https://linkedin.com/in/test',
            linkedinSummary:
                'Product manager con cinco anos de experiencia liderando equipos, analitica, discovery y ejecucion de producto digital.',
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.cvAnalysisId);
    assert.equal(response.body.data.recommendation.springUrl, 'https://lar.dev/sprints/tecnologia');
    assert.equal(response.body.data.recommendation.sprintUrl, 'https://lar.dev/sprints/tecnologia');
    assert.equal(response.body.data.recommendation.sprint.courses.length, 6);
    assert.equal(response.body.data.recommendation.sprint.blocks.length, 6);

    const user = [...store.users._db.values()].find((item) => item.email === 'user123@gmail.com');
    assert.equal(user.cvAnalysisId, response.body.data.cvAnalysisId);
    assert.equal(user.linkedinUrl, 'https://linkedin.com/in/test');
    assert.equal(user.journeyContext.latestCompletedAnalysisId, response.body.data.cvAnalysisId);
    assert.equal(user.journeyContext.analysisCount, 1);
    assert.equal(user.journeyContext.onboardingStage, 'review_recommendation');
});

test('POST /api/cv/linkedin pins Arquitectura Analitica Avanzada for Data Science', async () => {
    const { resolveUniversityRecommendation } = require('../src/ai/university-route-planner');
    const { request } = createTestApp({
        stubs: {
            'src/ai/orchestrator.js': {
                createAiOrchestrator: () => ({
                    extractProfile: async () => ({
                        name: 'Ana Datos',
                        currentRole: 'Data Scientist',
                        yearsOfExperience: 8,
                        industry: 'Tecnologia',
                        skills: ['Python', 'Machine Learning', 'MLOps'],
                        education: [],
                        experience: [],
                        languages: ['Espanol'],
                        certifications: [],
                        summary: 'Perfil senior con alto conocimiento tecnologico en datos.',
                    }),
                    generateRecommendation: async ({ profile, options }) =>
                        resolveUniversityRecommendation({
                            profile,
                            masterId: options.masterId,
                            sourceMasterId: options.masterId,
                            aiRecommendation: {
                                primarySpecializationId: 'analitica-datos',
                                planBlocks: [
                                    {
                                        specializationId: 'tecnologia',
                                        blockTitle: 'Estrategia de Ciberseguridad',
                                    },
                                    {
                                        specializationId: 'analitica-datos',
                                        blockTitle: 'Analítica de datos para directivos',
                                    },
                                ],
                            },
                        }),
                    analyzeLinkedIn: async () => ({ requiresManualInput: true }),
                }),
            },
        },
    });
    const token = await loginDefaultUser(request);

    const response = await request
        .post('/api/cv/linkedin')
        .set('Authorization', `Bearer ${token}`)
        .send({
            masterId: 'datalar-mba',
            linkedinUrl: 'https://linkedin.com/in/data-test',
            linkedinSummary:
                'Data scientist senior con experiencia en Python, machine learning, MLOps, arquitectura de datos y analitica avanzada.',
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.masterId, 'datalar-mba');
    assert.equal(response.body.data.recommendation.specialization.id, 'analitica-datos');
    assert.equal(response.body.data.recommendation.sprint.blocks.length, 6);
    assert.equal(response.body.data.recommendation.sprint.courses.length, 6);
    assert.ok(response.body.data.recommendation.sprint.blocks.every((block) => block.specializationId === 'analitica-datos'));
    assert.deepEqual(response.body.data.recommendation.sprint.blocks.map((block) => block.blockTitle), [
        'Analítica de datos para directivos',
        'Machine learning para la toma de decisiones empresariales',
        'Visualización de datos y cuadros de mando ejecutivos',
        'Analítica predictiva aplicada al negocio',
        'Gobierno del dato y calidad de la información',
        'Data-Driven management y cultura analítica',
    ]);
});
