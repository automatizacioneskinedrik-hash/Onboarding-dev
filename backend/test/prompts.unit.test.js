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

test('recommendation prompt enforces a 6-sprint route inside the selected MBA', () => {
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

    assert.match(prompt, /exactamente 6 sprints/);
    assert.match(prompt, /maximo 1 sprint por especializacion/);
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
    assert.match(messages[0].content, /CONTEXTO DE EXPERIENCIA DEL USUARIO/);
    assert.match(messages[0].content, /ALCANCE ESTRICTO DEL CHAT/);
    assert.match(messages[0].content, /primera interaccion real del usuario/i);
    assert.match(messages[0].content, /Markdown simple y limpio/i);
    assert.match(messages[0].content, /no eres un chatbot generalista/i);
    assert.match(messages[0].content, /seleccionar MBA, cargar CV en PDF, analizar el perfil/i);
});
