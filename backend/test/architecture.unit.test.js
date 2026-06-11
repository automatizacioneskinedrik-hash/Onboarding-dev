const test = require('node:test');
const assert = require('node:assert/strict');

const { buildProfileExtractionPrompt, buildChatMessages } = require('../src/ai/prompt-builder');
const { createContextManager } = require('../src/ai/context-manager');
const { createAiOrchestrator } = require('../src/ai/orchestrator');
const { createRegenerateRecommendationUseCases } = require('../src/use-cases/regenerate-recommendation');
const { buildAppContainer } = require('../src/composition-root');
const { resolveUniversityRecommendation } = require('../src/ai/university-route-planner');
const { learningModules, topics } = require('../src/utils/seed-learning-content');

test('prompt builder keeps centralized AI prompts available', () => {
    const prompt = buildProfileExtractionPrompt('CV de ejemplo');
    const messages = buildChatMessages([{ role: 'user', content: 'Hola' }]);

    assert.match(prompt, /CV de ejemplo/);
    assert.equal(messages[0].role, 'system');
    assert.equal(messages[1].content, 'Hola');
});

test('context manager retrieves courses through injected infra dependencies', async () => {
    // Esta prueba protege la inversion de dependencias: el context manager no deberia
    // acoplarse a implementaciones concretas de Firestore.
    const contextManager = createContextManager({
        catalogRepo: {
            readSprintModulesByMasterId: async () => [{
                id: 'module-1',
                title: 'Arquitectura de Producto',
                catalog_type: 'sprint',
                master_id: 'mtecmba',
                specialization_id: 'tecnologia',
                description: 'Descripcion',
                difficulty: 3,
                estimated_hours: 12,
                order: 1,
            }],
            readTopicsByModuleId: async () => [{ title: 'Discovery' }],
            loadSprintCatalogForSpecialization: async () => null,
        },
    });

    const retrieval = await contextManager.retrieveRelevantCourses({
        question: 'Producto digital',
        masterId: 'mtecmba',
    });

    assert.equal(retrieval.matches[0].id, 'module-1');
    assert.match(retrieval.contextText, /Arquitectura de Producto/);
    assert.equal(retrieval.vectorSearch.source, 'catalog_ranking');
});

test('ai orchestrator falls back cleanly when OpenAI is unavailable', async () => {
    // Sin proveedor externo la aplicacion aun debe poder recomendar algo coherente para
    // entornos locales, demos y pruebas de contrato.
    const orchestrator = createAiOrchestrator({
        openAiClient: {
            isConfigured: () => false,
            ensureConfigured: () => {
                throw new Error('should not be called');
            },
            getChatModel: () => 'gpt-test',
        },
        contextManager: {
            buildMasterCatalogFallbackRetrieval: async () => ({
                matches: [
                    {
                        id: 'course-1',
                        title: 'Arquitectura de Producto',
                        contentType: 'learning_module',
                        moduleId: 'module-1',
                        moduleTitle: 'Producto',
                        specializationId: 'tecnologia',
                        distance: 0.12,
                    },
                ],
                moduleRanking: [
                    {
                        moduleId: 'module-1',
                        moduleTitle: 'Producto',
                        specializationId: 'tecnologia',
                    },
                ],
                contextText: 'Resultado 1',
            }),
            loadSprintCatalogForSpecialization: async () => ({
                title: 'Sprint Tecnologia',
                topics: ['Arquitectura', 'Producto'],
            }),
        },
        promptBuilder: {
            buildProfileExtractionPrompt: () => 'prompt',
            buildRecommendationPrompt: () => 'prompt',
            buildChatMessages: () => [],
        },
    });

    const recommendation = await orchestrator.generateRecommendation({
        profile: {
            currentRole: 'Product Manager',
            skills: ['Producto', 'Analitica'],
        },
        options: { masterId: 'mtecmba' },
    });

    assert.ok(recommendation.primarySpecializationId);
    assert.equal(recommendation.planBlocks.length, 6);
    assert.ok(recommendation.recommendedCourses.length >= 1);
    assert.match(recommendation.reasoning, /respaldo|recomienda/i);
});

test('university route planner builds a full route from the selected specialization', () => {
    const recommendation = resolveUniversityRecommendation({
        profile: {
            currentRole: 'Data Engineer',
            skills: ['Python', 'MLOps', 'Arquitectura de datos'],
            summary: 'Perfil tecnico senior de data science.',
        },
        masterId: 'datalar-mba',
        sourceMasterId: 'datalar-mba',
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
    });

    assert.equal(recommendation.primarySpecializationId, 'analitica-datos');
    assert.equal(recommendation.planBlocks.length, 6);
    assert.ok(recommendation.planBlocks.every((block) => block.specializationId === 'analitica-datos'));
    assert.deepEqual(recommendation.planBlocks.map((block) => block.blockTitle), [
        'Analítica de datos para directivos',
        'Machine learning para la toma de decisiones empresariales',
        'Visualización de datos y cuadros de mando ejecutivos',
        'Analítica predictiva aplicada al negocio',
        'Gobierno del dato y calidad de la información',
        'Data-Driven management y cultura analítica',
    ]);
});

test('university route planner respects the selected specialization for redirected MTECH MBA', () => {
    const recommendation = resolveUniversityRecommendation({
        profile: {
            currentRole: 'Product Manager',
            skills: ['Producto', 'Liderazgo'],
        },
        masterId: 'datalar-mba',
        sourceMasterId: 'mtecmba',
        aiRecommendation: {
            primarySpecializationId: 'tecnologia',
        },
    });

    assert.equal(recommendation.planBlocks.length, 6);
    assert.equal(recommendation.primarySpecializationId, 'tecnologia');
    assert.ok(recommendation.planBlocks.every((block) => block.specializationId === 'tecnologia'));
    assert.equal(recommendation.planBlocks[0].blockTitle, 'Estrategia de Ciberseguridad');
});

test('learning content seed prioritizes advanced analytics architecture for Data Science', () => {
    const datalarAnalyticsModule = learningModules.find(
        (module) =>
            module.master_id === 'datalar-mba' &&
            module.catalog_type === 'sprint' &&
            module.specialization_id === 'analitica-datos'
    );
    const invalidAdvancedModule = learningModules.find(
        (module) => module.specialization_id === 'analitica-datos-Avanzada'
    );
    const datalarAnalyticsTopics = topics
        .filter(
            (topic) =>
                topic.master_id === 'datalar-mba' &&
                topic.catalog_type === 'sprint' &&
                topic.specialization_id === 'analitica-datos'
        )
        .sort((left, right) => left.order - right.order);

    assert.equal(invalidAdvancedModule, undefined);
    assert.match(datalarAnalyticsModule.title, /Arquitectura Analitica Avanzada|Arquitectura Anal.tica Avanzada/i);
    assert.match(datalarAnalyticsTopics[0].title, /Arquitectura .*Avanzada/i);
});

test('regenerate recommendation use case normalizes and persists recommendation data', async () => {
    const updates = [];
    const useCases = createRegenerateRecommendationUseCases({
        analysisRepo: {
            findById: async () => ({
                id: 'analysis-1',
                userId: 'user-1',
                sourceType: 'pdf',
                masterId: 'mtecmba',
                extractedProfile: { currentRole: 'PM' },
            }),
            update: async (id, payload) => {
                updates.push({ id, payload });
                return payload;
            },
        },
        aiOrchestrator: {
            generateRecommendation: async () => ({
                primarySpecialization: 'Tecnologia',
                primarySpecializationId: 'tecnologia',
                matchScore: 90,
                reasoning: 'Recomendacion de prueba',
                subjects: ['Arquitectura'],
                sprintUrl: 'https://lar.dev/sprints/tecnologia',
                specialization: {
                    id: 'tecnologia',
                    name: 'Tecnologia',
                    sprintUrl: 'https://lar.dev/sprints/tecnologia',
                },
            }),
        },
    });

    const recommendation = await useCases.regenerateUserRecommendation({
        cvAnalysisId: 'analysis-1',
        user: { id: 'user-1', selectedMasterId: 'mtecmba' },
    });

    // Verificamos la compatibilidad entre el modelo canonico y el alias legacy que todavia
    // consumen algunos clientes.
    assert.equal(recommendation.primarySpecializationId, 'tecnologia');
    assert.equal(updates[0].id, 'analysis-1');
    assert.equal(updates[0].payload.recommendation.springUrl, 'https://lar.dev/sprints/tecnologia');
});

test('composition root wires modular dependencies in memory mode', () => {
    // Configuramos solo lo imprescindible para comprobar que el contenedor puede arrancar
    // sin tocar servicios externos.
    process.env.USE_FIRESTORE = 'false';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client';
    process.env.JWT_SECRET = 'test-secret';

    const container = buildAppContainer({ useFirestore: false });

    assert.equal(typeof container.useCases.uploadCvAnalysis, 'function');
    assert.equal(typeof container.ai.orchestrator.generateRecommendation, 'function');
    assert.equal(typeof container.repositories.userRepo.safe, 'function');
});
