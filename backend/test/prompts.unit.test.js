const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildProfileExtractionPrompt,
    buildRecommendationPrompt,
    buildChatMessages,
} = require('../src/ai/prompt-builder');

test('profile extraction prompt includes CV text', () => {
    const prompt = buildProfileExtractionPrompt('CV de ejemplo');

    assert.match(prompt, /CV de ejemplo/);
    assert.match(prompt, /JSON valido/);
});

test('recommendation prompt enforces a 6-block route inside the selected MBA', () => {
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
        specializationsList: 'tecnologia',
    });

    assert.match(prompt, /exactamente 6 bloques/);
    assert.match(prompt, /maximo 1 bloque por especializacion/);
    assert.match(prompt, /Master seleccionado: mtecmba/);
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
