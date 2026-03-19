const test = require('node:test');
const assert = require('node:assert/strict');

const { buildProfileExtractionPrompt } = require('../src/services/openai/prompts/profile-extraction.prompt');
const { buildRecommendationPrompt } = require('../src/services/openai/prompts/recommendation-generation.prompt');
const { buildChatMessages } = require('../src/services/openai/prompts/chat-advisor.prompt');
const { resolveSpecializationIdFromMatch } = require('../src/services/openai/ai-fallbacks.service');

test('profile extraction prompt includes CV text', () => {
    const prompt = buildProfileExtractionPrompt('CV de ejemplo');

    assert.match(prompt, /CV de ejemplo/);
    assert.match(prompt, /JSON valido/);
});

test('recommendation prompt includes retrieved context and preferred specialization', () => {
    const prompt = buildRecommendationPrompt({
        profile: {
            name: 'Ana',
            currentRole: 'PM',
            industry: 'Tecnologia',
            yearsOfExperience: 5,
            skills: ['Producto'],
            summary: 'Perfil de prueba',
        },
        options: { masterId: 'mtecmba' },
        retrievedCatalogContext: 'Resultado 1',
        retrieval: {
            moduleRanking: [{ moduleId: 'module-1', moduleTitle: 'Producto', specializationId: 'tecnologia' }],
        },
        preferredSpecializationId: 'tecnologia',
        specializationsList: 'tecnologia',
        resolveSpecializationIdFromMatch,
    });

    assert.match(prompt, /Resultado 1/);
    assert.match(prompt, /specialization_id_preferido: tecnologia/);
});

test('chat prompt keeps system role and user messages', () => {
    const messages = buildChatMessages(
        [{ role: 'user', content: 'Hola' }],
        { name: 'Ana', currentRole: 'PM', industry: 'Tecnologia', skills: ['Producto'] },
        { primarySpecialization: 'Tecnologia', matchScore: 90, subjects: ['Arquitectura'] },
        { matches: [{ id: '1' }], contextText: 'Catalogo relevante' }
    );

    assert.equal(messages[0].role, 'system');
    assert.equal(messages[1].content, 'Hola');
    assert.match(messages[0].content, /Catalogo relevante/);
});
