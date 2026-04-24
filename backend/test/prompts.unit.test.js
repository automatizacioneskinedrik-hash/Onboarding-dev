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

test('recommendation prompt pins Arquitectura Analitica Avanzada for Data Science', () => {
    const prompt = buildRecommendationPrompt({
        profile: {
            name: 'Ana',
            currentRole: 'Data Scientist',
            industry: 'Tecnologia',
            yearsOfExperience: 8,
            skills: ['Python', 'Machine Learning'],
            summary: 'Perfil senior de datos',
        },
        options: { masterId: 'datalar-mba' },
        specializationsList: 'analitica-datos',
    });

    assert.match(prompt, /REGLA ESPECIAL PARA DATA SCIENCE/);
    assert.match(prompt, /Arquitectura Analitica Avanzada debe ser siempre el primer sprint/);
    assert.match(prompt, /Los otros 5 sprints deben elegirse segun el mejor ajuste/);
});

test('recommendation prompt does not pin Data Science rule for redirected MTECH MBA', () => {
    const prompt = buildRecommendationPrompt({
        profile: {
            name: 'Ana',
            currentRole: 'PM',
            industry: 'Tecnologia',
            yearsOfExperience: 5,
            skills: ['Producto'],
            summary: 'Perfil de prueba',
        },
        options: { masterId: 'datalar-mba', sourceMasterId: 'mtecmba' },
        specializationsList: 'analitica-datos',
    });

    assert.doesNotMatch(prompt, /REGLA ESPECIAL PARA DATA SCIENCE/);
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
    assert.match(messages[0].content, /seleccionar Master, cargar CV en PDF, analizar el perfil/i);
    assert.match(messages[0].content, /maximo de 20 interacciones/i);
});

test('chat prompt prioritizes advanced analytics architecture over containing specialization', () => {
    const messages = buildChatMessages(
        [{ role: 'user', content: 'Que sprint deberia priorizar primero?' }],
        { name: 'Sergio', currentRole: 'Analista de Integraciones', industry: 'Tecnologia', skills: ['C#', 'Python'] },
        {
            specialization: { name: 'ANALITICA DE DATOS Y DECISION EMPRESARIAL' },
            matchScore: 90,
            subjects: ['Arquitectura Analitica Avanzada', 'IA y Deep Learning para Negocios'],
            sprint: {
                blocks: [
                    {
                        blockTitle: 'Arquitectura Analitica Avanzada',
                        specializationName: 'ANALITICA DE DATOS Y DECISION EMPRESARIAL',
                    },
                ],
            },
        }
    );

    assert.match(messages[0].content, /Sprint prioritario: Arquitectura Analitica Avanzada/);
    assert.match(messages[0].content, /No presentes Analitica de Datos y Decision Empresarial como el sprint prioritario/);
});
